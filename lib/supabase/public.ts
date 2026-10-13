import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Cookie-less client for public pages. It always acts as the anonymous role,
 * so Row Level Security only ever returns published competitions — even when
 * an administrator happens to be signed in on the same browser.
 */
export function createPublicSupabaseClient() {
  const { supabaseUrl, supabaseKey } = getPublicEnv();
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export type PublicSupabaseClient = ReturnType<typeof createPublicSupabaseClient>;
