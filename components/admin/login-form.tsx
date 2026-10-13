"use client";

import { useActionState, useId, useState } from "react";
import { CircleAlert, Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react";
import { z } from "zod";
import { signIn } from "@/lib/actions/auth";
import type { LoginState } from "@/lib/actions/types";
import { loginSchema } from "@/lib/validation/login";

const INITIAL_STATE: LoginState = { error: null };

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signIn, INITIAL_STATE);
  const [showPassword, setShowPassword] = useState(false);
  const [clientErrors, setClientErrors] = useState<{ email?: string; password?: string }>({});
  const emailId = useId();
  const passwordId = useId();

  const emailError = clientErrors.email ?? state.fieldErrors?.email?.[0];
  const passwordError = clientErrors.password ?? state.fieldErrors?.password?.[0];

  return (
    <form
      action={formAction}
      noValidate
      className="space-y-5"
      onSubmit={(event) => {
        // Browser-side validation for instant feedback; the server validates again.
        const data = new FormData(event.currentTarget);
        const parsed = loginSchema.safeParse({ email: String(data.get("email") ?? "").trim(), password: String(data.get("password") ?? "") });
        if (!parsed.success) {
          event.preventDefault();
          const fieldErrors = z.flattenError(parsed.error).fieldErrors;
          setClientErrors({ email: fieldErrors.email?.[0], password: fieldErrors.password?.[0] });
          return;
        }
        setClientErrors({});
      }}
    >
      <input type="hidden" name="next" value={next} />

      {state.error && !pending && (
        <div role="alert" className="flex items-start gap-3 border-l-4 border-danger bg-danger/10 p-3.5 text-sm">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor={emailId} className="field-label">
          Email
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          defaultValue={state.email}
          className="field-input"
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? `${emailId}-error` : undefined}
        />
        {emailError && (
          <p id={`${emailId}-error`} className="field-error">
            {emailError}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={passwordId} className="field-label">
          Password
        </label>
        <div className="relative">
          <input
            id={passwordId}
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="field-input pr-12"
            aria-invalid={passwordError ? true : undefined}
            aria-describedby={passwordError ? `${passwordId}-error` : undefined}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute top-1/2 right-1.5 flex size-9 -translate-y-1/2 items-center justify-center text-mist hover:text-ink"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            aria-controls={passwordId}
          >
            {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
          </button>
        </div>
        {passwordError && (
          <p id={`${passwordId}-error`} className="field-error">
            {passwordError}
          </p>
        )}
      </div>

      <button type="submit" className="btn btn-primary w-full py-4" disabled={pending}>
        {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <LogIn className="size-4" aria-hidden="true" />}
        {pending ? "Verifying…" : "Sign in"}
      </button>
    </form>
  );
}
