"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminAction } from "@/lib/auth/admin";
import { POSTER_BUCKET, POSTER_MAX_BYTES, SITE_TIME_ZONE } from "@/lib/config";
import { createPosterPath, isPosterPath } from "@/lib/images/poster-storage";
import {
  discardUnreferencedPoster,
  findOrphanedPosters,
  isPosterReferenced,
  removePosterObject,
  verifyUploadedPoster,
} from "@/lib/storage/posters";
import { isUuid } from "@/lib/utils";
import {
  competitionPayloadSchema,
  posterUploadRequestSchema,
  toCompetitionWrite,
  type CompetitionPayload,
} from "@/lib/validation/competition";
import type {
  ActionFieldErrors,
  ActionResult,
  CleanupSummary,
  DeletedCompetition,
  PosterUploadTicket,
  SavedCompetition,
} from "./types";

function fail(error: string, fieldErrors?: ActionFieldErrors): { ok: false; error: string; fieldErrors?: ActionFieldErrors } {
  return fieldErrors ? { ok: false, error, fieldErrors } : { ok: false, error };
}

function revalidateCompetitionViews(id?: string) {
  revalidatePath("/");
  revalidatePath("/admin");
  if (id) revalidatePath(`/competitions/${id}`);
}

function describeWriteError(error: { code?: string; message?: string } | null): string {
  if (!error) return "The competition could not be saved. Please try again.";
  console.error("[actions] competition write failed", { code: error.code, message: error.message });
  switch (error.code) {
    case "42501":
      return "You are not authorized to make this change.";
    case "23514":
      return "Some details were rejected by the database. Please review the form and try again.";
    case "23505":
      return "That poster is already used by another competition. Please upload a new poster.";
    default:
      return "The competition could not be saved. Please try again.";
  }
}

/**
 * Step 1 of a poster upload: the server authorizes the admin, validates the
 * declared type/size and returns a one-time signed URL for a fresh, unique,
 * server-chosen path. The browser then uploads directly to Storage (keeping
 * large files off the serverless function and enabling progress reporting).
 */
export async function requestPosterUpload(input: unknown): Promise<ActionResult<PosterUploadTicket>> {
  const guard = await requireAdminAction();
  if (!guard.ok) return fail(guard.error);

  const parsed = posterUploadRequestSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Only JPEG, PNG and WebP posters are supported.", { poster: ["Unsupported file type."] });
  }
  if (parsed.data.size > POSTER_MAX_BYTES) {
    const limit = Math.round(POSTER_MAX_BYTES / 1024 / 1024);
    return fail(`Posters must be ${limit} MB or smaller.`, { poster: [`Posters must be ${limit} MB or smaller.`] });
  }

  const path = createPosterPath(parsed.data.contentType);
  const { data, error } = await guard.admin.supabase.storage.from(POSTER_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[actions] createSignedUploadUrl failed", { message: error?.message });
    return fail("Could not prepare the poster upload. Please try again.");
  }
  return { ok: true, data: { path, signedUrl: data.signedUrl, token: data.token } };
}

/** Validates the payload and converts it into database columns. */
function prepareWrite(input: unknown):
  | { ok: true; payload: CompetitionPayload; write: ReturnType<typeof toCompetitionWrite> & { ok: true } }
  | { ok: false; error: string; fieldErrors?: ActionFieldErrors; posterPath: string | null } {
  const rawPosterPath =
    typeof input === "object" && input !== null && "posterPath" in input && isPosterPath((input as { posterPath: unknown }).posterPath)
      ? ((input as { posterPath: string }).posterPath)
      : null;

  const parsed = competitionPayloadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      posterPath: rawPosterPath,
    };
  }

  const write = toCompetitionWrite(parsed.data, SITE_TIME_ZONE);
  if (!write.ok) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: write.fieldErrors, posterPath: rawPosterPath };
  }
  return { ok: true, payload: parsed.data, write };
}

/**
 * Creates a competition. Sequence: authorize → validate fields → verify the
 * uploaded poster bytes → insert → on failure, delete the just-uploaded poster.
 */
export async function createCompetition(input: unknown): Promise<ActionResult<SavedCompetition>> {
  const guard = await requireAdminAction();
  if (!guard.ok) return fail(guard.error);
  const { supabase } = guard.admin;

  const prepared = prepareWrite(input);
  if (!prepared.ok) {
    await discardUnreferencedPoster(supabase, prepared.posterPath);
    return fail(prepared.error, prepared.fieldErrors);
  }
  const { payload, write } = prepared;

  let poster: { poster_path: string; poster_width: number; poster_height: number } | null = null;
  if (payload.posterPath) {
    const verified = await verifyUploadedPoster(supabase, payload.posterPath);
    if (!verified.ok) {
      await discardUnreferencedPoster(supabase, payload.posterPath);
      return fail(verified.reason, { poster: [verified.reason] });
    }
    poster = { poster_path: verified.path, poster_width: verified.info.width, poster_height: verified.info.height };
  }

  if (write.data.status === "published" && !poster) {
    return fail("A poster is required before a competition can be published.", {
      poster: ["Upload a poster to publish this competition, or save it as a draft."],
    });
  }

  // created_by is intentionally omitted: the database sets it from the verified JWT.
  const { data, error } = await supabase
    .from("competitions")
    .insert({ ...write.data, ...(poster ?? {}) })
    .select("id")
    .single();

  if (error || !data) {
    if (poster) await discardUnreferencedPoster(supabase, poster.poster_path);
    return fail(describeWriteError(error));
  }

  revalidateCompetitionViews(data.id);
  return { ok: true, data: { id: data.id, orphanedPosterPath: null } };
}

/**
 * Updates a competition. A replacement poster is uploaded to a NEW path first;
 * the old object is deleted only after the database update succeeded.
 */
export async function updateCompetition(id: string, input: unknown): Promise<ActionResult<SavedCompetition>> {
  const guard = await requireAdminAction();
  if (!guard.ok) return fail(guard.error);
  const { supabase } = guard.admin;

  const prepared = prepareWrite(input);
  if (!isUuid(id)) {
    if (prepared.ok) await discardUnreferencedPoster(supabase, prepared.payload.posterPath);
    return fail("Competition not found.");
  }
  if (!prepared.ok) {
    await discardUnreferencedPoster(supabase, prepared.posterPath);
    return fail(prepared.error, prepared.fieldErrors);
  }
  const { payload, write } = prepared;

  const { data: existing, error: loadError } = await supabase
    .from("competitions")
    .select("id,poster_path")
    .eq("id", id)
    .maybeSingle();
  if (loadError || !existing) {
    await discardUnreferencedPoster(supabase, payload.posterPath);
    return fail(loadError ? "Could not load the competition. Please try again." : "Competition not found.");
  }

  let replacement: { poster_path: string; poster_width: number; poster_height: number } | null = null;
  if (payload.posterPath && payload.posterPath !== existing.poster_path) {
    const verified = await verifyUploadedPoster(supabase, payload.posterPath);
    if (!verified.ok) {
      await discardUnreferencedPoster(supabase, payload.posterPath);
      return fail(verified.reason, { poster: [verified.reason] });
    }
    replacement = { poster_path: verified.path, poster_width: verified.info.width, poster_height: verified.info.height };
  }

  const finalPosterPath = replacement?.poster_path ?? existing.poster_path;
  if (write.data.status === "published" && !finalPosterPath) {
    return fail("A poster is required before a competition can be published.", {
      poster: ["Upload a poster to publish this competition, or keep it as a draft."],
    });
  }

  const { data: updated, error } = await supabase
    .from("competitions")
    .update({ ...write.data, ...(replacement ?? {}) })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    // The old poster is untouched; only the unused new upload is discarded.
    if (replacement) await discardUnreferencedPoster(supabase, replacement.poster_path);
    return fail(error ? describeWriteError(error) : "Competition not found.");
  }

  revalidateCompetitionViews(id);

  if (replacement && existing.poster_path) {
    const removal = await removePosterObject(supabase, existing.poster_path);
    if (!removal.ok) {
      return {
        ok: true,
        data: { id, orphanedPosterPath: existing.poster_path },
        warning: "Saved. The previous poster file could not be removed — you can retry the cleanup now or later from Storage maintenance.",
      };
    }
  }

  return { ok: true, data: { id, orphanedPosterPath: null } };
}

/**
 * Deletes a competition record, then its poster. If the poster removal fails,
 * the result says so explicitly (the record is gone, the file is orphaned).
 */
export async function deleteCompetition(id: string): Promise<ActionResult<DeletedCompetition>> {
  const guard = await requireAdminAction();
  if (!guard.ok) return fail(guard.error);
  const { supabase } = guard.admin;
  if (!isUuid(id)) return fail("Competition not found.");

  const { data: deleted, error } = await supabase
    .from("competitions")
    .delete()
    .eq("id", id)
    .select("id,title,poster_path")
    .maybeSingle();

  if (error) return fail(describeWriteError(error));
  if (!deleted) return fail("Competition not found — it may already have been deleted.");

  revalidateCompetitionViews(id);

  if (deleted.poster_path) {
    const removal = await removePosterObject(supabase, deleted.poster_path);
    if (!removal.ok) {
      return {
        ok: true,
        data: { id, title: deleted.title, orphanedPosterPath: deleted.poster_path },
        warning: `“${deleted.title}” was deleted, but its poster file could not be removed. Retry the cleanup or use Storage maintenance.`,
      };
    }
  }

  return { ok: true, data: { id, title: deleted.title, orphanedPosterPath: null } };
}

/** Retries deletion of a poster left behind by a partial failure. Refuses referenced posters. */
export async function retryPosterCleanup(path: string): Promise<ActionResult<{ path: string }>> {
  const guard = await requireAdminAction();
  if (!guard.ok) return fail(guard.error);
  const { supabase } = guard.admin;
  if (!isPosterPath(path)) return fail("Invalid poster path.");

  const referenced = await isPosterReferenced(supabase, path);
  if (referenced === null) return fail("Could not check whether the poster is still in use. Please try again.");
  if (referenced) return fail("This poster is used by a competition and was not deleted.");

  const removal = await removePosterObject(supabase, path);
  if (!removal.ok) return fail(`Cleanup failed: ${removal.reason}`);
  return { ok: true, data: { path } };
}

/** Removes orphaned poster objects (unreferenced and older than the grace period). */
export async function cleanupOrphanedPosters(paths: unknown): Promise<ActionResult<CleanupSummary>> {
  const guard = await requireAdminAction();
  if (!guard.ok) return fail(guard.error);
  const { supabase } = guard.admin;

  const parsed = z.array(z.string()).max(500).safeParse(paths);
  if (!parsed.success) return fail("Invalid selection.");
  const requested = Array.from(new Set(parsed.data));

  // Re-derive the orphan list on the server; never trust the client's view.
  const orphans = await findOrphanedPosters(supabase);
  if (!orphans.ok) return fail(orphans.error);
  const orphanByPath = new Map(orphans.data.map((object) => [object.path, object]));

  const summary: CleanupSummary = { removed: [], skipped: [], failed: [] };
  for (const path of requested) {
    const orphan = orphanByPath.get(path);
    if (!isPosterPath(path) || !orphan) {
      summary.skipped.push({ path, reason: "Not an orphaned poster." });
      continue;
    }
    if (orphan.isRecent) {
      summary.skipped.push({ path, reason: "Uploaded less than an hour ago (may still be in use)." });
      continue;
    }
    const removal = await removePosterObject(supabase, path);
    if (removal.ok) summary.removed.push(path);
    else summary.failed.push({ path, reason: removal.reason });
  }

  revalidatePath("/admin/storage");
  return { ok: true, data: summary };
}
