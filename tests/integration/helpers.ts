import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export interface IntegrationEnv {
  url: string;
  publishableKey: string;
  secretKey: string;
}

export function readIntegrationEnv(): IntegrationEnv | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SERVICE_ROLE_KEY;
  if (!url || !publishableKey || !secretKey) return null;
  return { url, publishableKey, secretKey };
}

/** service_role client — bypasses RLS. Used only for test setup/teardown and provisioning. */
export function createAdminClient(env: IntegrationEnv): SupabaseClient<Database> {
  return createClient<Database>(env.url, env.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** anon client — subject to RLS, like the public site. */
export function createAnonClient(env: IntegrationEnv): SupabaseClient<Database> {
  return createClient<Database>(env.url, env.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface TestUser {
  id: string;
  email: string;
  password: string;
  client: SupabaseClient<Database>;
}

/**
 * Creates a confirmed Auth user and returns a client already signed in as them.
 * When `admin` is true, the user is also inserted into admin_users (via service role).
 */
export async function createUser(env: IntegrationEnv, admin: boolean): Promise<TestUser> {
  const service = createAdminClient(env);
  const email = `test-${randomUUID()}@pixel-quest.test`;
  const password = `Pw-${randomUUID()}`;

  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  const id = data.user.id;

  if (admin) {
    const { error: insertError } = await service.from("admin_users").insert({ user_id: id, note: "integration test" });
    if (insertError) throw new Error(`admin provisioning failed: ${insertError.message}`);
  }

  const client = createClient<Database>(env.url, env.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`sign-in failed: ${signInError.message}`);

  return { id, email, password, client };
}

export async function deleteUser(env: IntegrationEnv, userId: string): Promise<void> {
  const service = createAdminClient(env);
  await service.from("admin_users").delete().eq("user_id", userId);
  await service.auth.admin.deleteUser(userId).catch(() => undefined);
}

/** A tiny but valid 1×1 PNG. */
export function tinyPng(): Uint8Array {
  return Uint8Array.from(
    atob(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    ),
    (c) => c.charCodeAt(0),
  );
}

export function uniqueTitle(prefix = "Quest"): string {
  return `${prefix} ${randomUUID().slice(0, 8)}`;
}
