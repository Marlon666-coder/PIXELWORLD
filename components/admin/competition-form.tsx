"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useForm, useWatch, type DefaultValues, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, CircleCheck, LoaderCircle, Save, TriangleAlert } from "lucide-react";
import { createCompetition, requestPosterUpload, retryPosterCleanup, updateCompetition } from "@/lib/actions/competitions";
import type { ActionFieldErrors } from "@/lib/actions/types";
import { CATEGORIES } from "@/lib/categories";
import { inspectPosterFile, PosterUploadError, uploadPosterToSignedUrl } from "@/lib/client/poster-upload";
import { readPublicEnv } from "@/lib/env";
import { COMPETITION_LIMITS, competitionFormSchema, type CompetitionFormValues } from "@/lib/validation/competition";
import { cn } from "@/lib/utils";
import { PosterDropzone, type SelectedPoster } from "./poster-dropzone";

type Phase = "idle" | "uploading" | "saving" | "done";

interface CompetitionFormProps {
  mode: "create" | "edit";
  competitionId?: string;
  initialValues: DefaultValues<CompetitionFormValues>;
  existingPosterUrl: string | null;
  timeZoneLabel: string;
  maxPosterBytes: number;
}

const FORM_FIELDS: FieldPath<CompetitionFormValues>[] = [
  "title",
  "organizer",
  "category",
  "description",
  "registrationDeadline",
  "eventDate",
  "registrationUrl",
  "status",
];

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="field-error">
      {message}
    </p>
  );
}

export function CompetitionForm({ mode, competitionId, initialValues, existingPosterUrl, timeZoneLabel, maxPosterBytes }: CompetitionFormProps) {
  const router = useRouter();
  const idPrefix = useId();
  const fieldId = (name: string) => `${idPrefix}-${name}`;

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<CompetitionFormValues>({
    resolver: zodResolver(competitionFormSchema),
    defaultValues: initialValues,
    mode: "onTouched",
  });

  const [poster, setPoster] = useState<SelectedPoster | null>(null);
  const [posterError, setPosterError] = useState<string | null>(null);
  const [checkingPoster, setCheckingPoster] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [warning, setWarning] = useState<{ message: string; orphanPath: string | null } | null>(null);
  const [cleanupState, setCleanupState] = useState<"idle" | "working" | "done" | "failed">("idle");
  const submitting = useRef(false);

  const busy = phase === "uploading" || phase === "saving" || phase === "done";
  const descriptionLength = (useWatch({ control, name: "description" }) ?? "").length;
  const status = useWatch({ control, name: "status" });

  // Release object URLs for poster previews.
  useEffect(() => {
    const url = poster?.previewUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [poster]);

  const selectFile = async (file: File) => {
    setPosterError(null);
    setCheckingPoster(true);
    try {
      const check = await inspectPosterFile(file, maxPosterBytes);
      if (!check.ok) {
        setPoster(null);
        setPosterError(check.reason);
        return;
      }
      setPoster({ file, info: check.info, previewUrl: URL.createObjectURL(file) });
    } finally {
      setCheckingPoster(false);
    }
  };

  const applyServerErrors = (message: string, fieldErrors?: ActionFieldErrors) => {
    setFormError(message);
    if (!fieldErrors) return;
    for (const [field, messages] of Object.entries(fieldErrors)) {
      const first = messages?.[0];
      if (!first) continue;
      if (field === "poster" || field === "posterPath") setPosterError(first);
      else if ((FORM_FIELDS as string[]).includes(field)) setError(field as FieldPath<CompetitionFormValues>, { type: "server", message: first });
    }
  };

  const submitValues = async (values: CompetitionFormValues) => {
    if (submitting.current) return; // Prevent duplicate submissions.
    submitting.current = true;
    setFormError(null);
    setWarning(null);

    let uploadedPath: string | null = null;
    let succeeded = false;
    try {
      if (values.status === "published" && !poster && !existingPosterUrl) {
        setPosterError("Upload a poster to publish this competition, or save it as a draft.");
        return;
      }

      if (poster) {
        const env = readPublicEnv();
        if (!env.ok) {
          setFormError("Supabase is not configured in this build.");
          return;
        }
        setPhase("uploading");
        setProgress(0);
        const ticket = await requestPosterUpload({ contentType: poster.info.mimeType, size: poster.file.size });
        if (!ticket.ok) {
          applyServerErrors(ticket.error, ticket.fieldErrors);
          return;
        }
        await uploadPosterToSignedUrl({
          signedUrl: ticket.data.signedUrl,
          file: poster.file,
          contentType: poster.info.mimeType,
          apiKey: env.env.supabaseKey,
          onProgress: setProgress,
        });
        uploadedPath = ticket.data.path;
      }

      setPhase("saving");
      const payload = { ...values, posterPath: uploadedPath };
      const result =
        mode === "create" ? await createCompetition(payload) : await updateCompetition(competitionId ?? "", payload);

      // The server has taken ownership of the upload (it cleans up on failure).
      uploadedPath = null;

      if (!result.ok) {
        applyServerErrors(result.error, result.fieldErrors);
        return;
      }

      succeeded = true;
      setPhase("done");
      if (result.warning) {
        setWarning({ message: result.warning, orphanPath: result.data.orphanedPosterPath });
        setPoster(null);
        router.refresh();
        return;
      }
      router.push(`/admin?notice=${mode === "create" ? "created" : "updated"}`);
    } catch (error) {
      setFormError(
        error instanceof PosterUploadError ? error.message : "Something went wrong while saving. Please check your connection and try again.",
      );
      // A poster may have been uploaded before the failure; remove it if nothing references it.
      if (uploadedPath) void retryPosterCleanup(uploadedPath).catch(() => undefined);
    } finally {
      submitting.current = false;
      if (!succeeded) setPhase("idle");
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    void handleSubmit(submitValues)(event);
  };

  const runCleanup = async () => {
    if (!warning?.orphanPath) return;
    setCleanupState("working");
    const result = await retryPosterCleanup(warning.orphanPath);
    setCleanupState(result.ok ? "done" : "failed");
  };

  const percent = Math.round(progress * 100);
  const submitLabel =
    phase === "uploading"
      ? `Uploading poster… ${percent}%`
      : phase === "saving"
        ? "Saving…"
        : mode === "create"
          ? status === "published"
            ? "Publish quest"
            : "Save draft"
          : "Save changes";

  const describedBy = (name: keyof CompetitionFormValues, hint?: boolean) =>
    [hint ? fieldId(`${name}-hint`) : null, errors[name] ? fieldId(`${name}-error`) : null].filter(Boolean).join(" ") || undefined;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8" aria-busy={busy}>
      {formError && (
        <div role="alert" className="panel flex items-start gap-3 border-l-4 border-danger p-4">
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
          <p className="text-sm">{formError}</p>
        </div>
      )}

      {warning && (
        <div role="status" className="panel space-y-3 border-l-4 border-neon-magenta p-4">
          <p className="flex items-start gap-3 text-sm">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-neon-magenta" aria-hidden="true" />
            {warning.message}
          </p>
          <div className="flex flex-wrap gap-2 pl-8">
            {warning.orphanPath && cleanupState !== "done" && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={runCleanup} disabled={cleanupState === "working"}>
                {cleanupState === "working" ? "Cleaning up…" : "Retry poster cleanup"}
              </button>
            )}
            {cleanupState === "done" && (
              <span className="inline-flex items-center gap-2 text-sm text-neon-green">
                <CircleCheck className="size-4" aria-hidden="true" /> Previous poster removed.
              </span>
            )}
            {cleanupState === "failed" && <span className="text-sm text-danger">Cleanup failed again. Use Storage maintenance later.</span>}
            <Link href="/admin" className="btn btn-ghost btn-sm">
              Back to dashboard
            </Link>
          </div>
        </div>
      )}

      <fieldset className="panel space-y-6 p-5 sm:p-7" disabled={busy}>
        <legend className="hud-label float-left mb-2 w-full text-neon-cyan">Quest details</legend>

        <div className="clear-left">
          <label htmlFor={fieldId("title")} className="field-label">
            Competition title *
          </label>
          <input
            id={fieldId("title")}
            className="field-input"
            maxLength={COMPETITION_LIMITS.titleMax}
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={describedBy("title")}
            {...register("title")}
          />
          <FieldError id={fieldId("title-error")} message={errors.title?.message} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label htmlFor={fieldId("organizer")} className="field-label">
              Organizer *
            </label>
            <input
              id={fieldId("organizer")}
              className="field-input"
              maxLength={COMPETITION_LIMITS.organizerMax}
              aria-invalid={errors.organizer ? true : undefined}
              aria-describedby={describedBy("organizer")}
              {...register("organizer")}
            />
            <FieldError id={fieldId("organizer-error")} message={errors.organizer?.message} />
          </div>
          <div>
            <label htmlFor={fieldId("category")} className="field-label">
              Category *
            </label>
            <select
              id={fieldId("category")}
              className="field-input cursor-pointer"
              aria-invalid={errors.category ? true : undefined}
              aria-describedby={describedBy("category")}
              {...register("category")}
            >
              <option value="">Select a category…</option>
              {CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
            <FieldError id={fieldId("category-error")} message={errors.category?.message} />
          </div>
        </div>

        <div>
          <label htmlFor={fieldId("description")} className="field-label">
            Description
          </label>
          <textarea
            id={fieldId("description")}
            rows={7}
            className="field-input resize-y leading-relaxed"
            maxLength={COMPETITION_LIMITS.descriptionMax}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={describedBy("description", true)}
            {...register("description")}
          />
          <p id={fieldId("description-hint")} className="field-hint">
            Optional. Blank lines separate paragraphs · {descriptionLength}/{COMPETITION_LIMITS.descriptionMax}
          </p>
          <FieldError id={fieldId("description-error")} message={errors.description?.message} />
        </div>
      </fieldset>

      <fieldset className="panel space-y-6 p-5 sm:p-7" disabled={busy}>
        <legend className="hud-label float-left mb-2 w-full text-neon-cyan">Timeline &amp; registration</legend>
        <div className="clear-left grid gap-6 md:grid-cols-2">
          <div>
            <label htmlFor={fieldId("registrationDeadline")} className="field-label">
              Registration deadline
            </label>
            <input
              id={fieldId("registrationDeadline")}
              type="datetime-local"
              className="field-input"
              aria-invalid={errors.registrationDeadline ? true : undefined}
              aria-describedby={describedBy("registrationDeadline", true)}
              {...register("registrationDeadline")}
            />
            <p id={fieldId("registrationDeadline-hint")} className="field-hint">
              Optional · {timeZoneLabel}
            </p>
            <FieldError id={fieldId("registrationDeadline-error")} message={errors.registrationDeadline?.message} />
          </div>
          <div>
            <label htmlFor={fieldId("eventDate")} className="field-label">
              Event date
            </label>
            <input
              id={fieldId("eventDate")}
              type="datetime-local"
              className="field-input"
              aria-invalid={errors.eventDate ? true : undefined}
              aria-describedby={describedBy("eventDate", true)}
              {...register("eventDate")}
            />
            <p id={fieldId("eventDate-hint")} className="field-hint">
              Optional · {timeZoneLabel}
            </p>
            <FieldError id={fieldId("eventDate-error")} message={errors.eventDate?.message} />
          </div>
        </div>
        <div>
          <label htmlFor={fieldId("registrationUrl")} className="field-label">
            Registration link
          </label>
          <input
            id={fieldId("registrationUrl")}
            type="url"
            inputMode="url"
            placeholder="https://organizer.example/register"
            className="field-input"
            maxLength={COMPETITION_LIMITS.urlMax}
            aria-invalid={errors.registrationUrl ? true : undefined}
            aria-describedby={describedBy("registrationUrl", true)}
            {...register("registrationUrl")}
          />
          <p id={fieldId("registrationUrl-hint")} className="field-hint">
            Optional. Must be a public http(s) link; it opens in a new tab.
          </p>
          <FieldError id={fieldId("registrationUrl-error")} message={errors.registrationUrl?.message} />
        </div>
      </fieldset>

      <fieldset className="space-y-3" disabled={busy}>
        <legend className="hud-label text-neon-cyan">Poster</legend>
        <PosterDropzone
          selected={poster}
          existingUrl={existingPosterUrl}
          error={posterError}
          disabled={busy}
          checking={checkingPoster}
          maxBytes={maxPosterBytes}
          onFile={selectFile}
          onClear={() => {
            setPoster(null);
            setPosterError(null);
          }}
        />
        {phase === "uploading" && (
          <div className="space-y-2">
            <div
              role="progressbar"
              aria-label="Poster upload progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="pixel-border h-3 w-full bg-void-900"
            >
              <div className="h-full bg-gradient-to-r from-neon-violet to-neon-cyan transition-[width] duration-150" style={{ width: `${percent}%` }} />
            </div>
            <p className="hud-label">Uploading poster · {percent}%</p>
          </div>
        )}
      </fieldset>

      <fieldset className="panel p-5 sm:p-7" disabled={busy}>
        <legend className="hud-label float-left mb-4 w-full text-neon-cyan">Publication</legend>
        <div className="clear-left grid gap-3 sm:grid-cols-2">
          {(
            [
              { value: "draft", title: "Draft", body: "Only administrators can see it." },
              { value: "published", title: "Published", body: "Visible in the public gallery immediately. Requires a poster." },
            ] as const
          ).map((option) => (
            <label
              key={option.value}
              className={cn(
                "chip h-auto cursor-pointer flex-col items-start gap-1 p-4 text-left normal-case tracking-normal",
                status === option.value && "[--pixel-border:var(--color-neon-cyan)] bg-void-700/70",
              )}
            >
              <span className="flex items-center gap-2">
                <input type="radio" value={option.value} className="accent-[#2de2f5]" {...register("status")} />
                <span className="font-mono text-xs tracking-[0.18em] text-ink uppercase">{option.title}</span>
              </span>
              <span className="text-sm text-mist">{option.body}</span>
            </label>
          ))}
        </div>
        <FieldError id={fieldId("status-error")} message={errors.status?.message} />
      </fieldset>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Link href="/admin" className="btn btn-ghost" aria-disabled={busy}>
          Cancel
        </Link>
        <button type="submit" className="btn btn-primary min-w-56" disabled={busy || checkingPoster}>
          {busy && phase !== "done" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
          {phase === "done" && !warning ? "Saved" : submitLabel}
        </button>
      </div>
    </form>
  );
}
