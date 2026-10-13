import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient, type ServerSupabaseClient } from "@/lib/supabase/server";

export interface SessionUser {
  id: string;
  email: string | null;
}

export type AdminContext =
  | { status: "anonymous" }
  | { status: "forbidden"; user: SessionUser }
  | { status: "admin"; user: SessionUser; supabase: ServerSupabaseClient };

export type AuthorizedAdmin = Extract<AdminContext, { status: "admin" }>;

export class AuthorizationCheckError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationCheckError";
  }
}

/**
 * Resolves who is making the request and whether they are an administrator.
 *
 * - The identity comes from `getClaims()`, which verifies the JWT signature
 *   (never from cookies or metadata the user could edit).
 * - Administrator status comes from the `is_admin()` database function, which
 *   checks the `admin_users` table that only trusted operators can write.
 *
 * Cached per request so layouts, pages and actions share one lookup.
 */
export const getAdminContext = cache(async (): Promise<AdminContext> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) {
    return { status: "anonymous" };
  }

  const user: SessionUser = {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
  };

  const { data: isAdmin, error: rpcError } = await supabase.rpc("is_admin");
  if (rpcError) {
    throw new AuthorizationCheckError("Unable to verify administrator access.");
  }

  return isAdmin === true ? { status: "admin", user, supabase } : { status: "forbidden", user };
});

/** For admin pages: redirects anonymous or unauthorized visitors to the login page. */
export async function requireAdminPage(currentPath: string): Promise<AuthorizedAdmin> {
  const context = await getAdminContext();
  if (context.status === "anonymous") {
    redirect(`/admin/login?next=${encodeURIComponent(currentPath)}`);
  }
  if (context.status === "forbidden") {
    redirect("/admin/login?error=forbidden");
  }
  return context;
}

export type AdminActionGuard = { ok: true; admin: AuthorizedAdmin } | { ok: false; error: string };

/** For Server Actions: never trusts the caller; re-checks session and role on every call. */
export async function requireAdminAction(): Promise<AdminActionGuard> {
  try {
    const context = await getAdminContext();
    if (context.status === "admin") return { ok: true, admin: context };
    if (context.status === "forbidden") {
      return { ok: false, error: "Your account is not authorized to manage competitions." };
    }
    return { ok: false, error: "Your session has expired. Please sign in again." };
  } catch {
    return { ok: false, error: "Unable to verify administrator access. Please try again." };
  }
}
