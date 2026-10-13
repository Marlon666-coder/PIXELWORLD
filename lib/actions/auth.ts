"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { readPublicEnv } from "@/lib/env";
import { safeAdminRedirect } from "@/lib/security/urls";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validation/login";
import type { LoginState } from "./types";

const GENERIC_CREDENTIALS_ERROR = "Invalid email or password.";

export async function signIn(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const parsed = loginSchema.safeParse({ email, password: String(formData.get("password") ?? "") });
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors, email };
  }

  if (!readPublicEnv().ok) {
    return { error: "Supabase is not configured on this deployment. See the README setup steps.", email };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Never reveal whether the email exists.
    const message =
      error.status === 429 ? "Too many sign-in attempts. Please wait a minute and try again." : GENERIC_CREDENTIALS_ERROR;
    return { error: message, email };
  }

  // Authentication is not authorization: only listed administrators may stay signed in.
  const { data: isAdmin, error: roleError } = await supabase.rpc("is_admin");
  if (roleError || isAdmin !== true) {
    await supabase.auth.signOut({ scope: "local" });
    return {
      error: roleError
        ? "Could not verify administrator access. Please try again."
        : "This account is not authorized to access the admin dashboard.",
      email,
    };
  }

  redirect(safeAdminRedirect(String(formData.get("next") ?? "")));
}

export async function signOut(): Promise<void> {
  if (readPublicEnv().ok) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut({ scope: "local" });
  }
  redirect("/admin/login");
}
