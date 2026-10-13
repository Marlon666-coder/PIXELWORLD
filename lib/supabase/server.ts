import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * User-scoped Supabase client for Server Components, Server Actions and Route
 * Handlers. Requests carry the signed-in user's JWT, so Row Level Security
 * decides what they can see and change. Create a new client per request.
 */
export async function createServerSupabaseClient() {
  const { supabaseUrl, supabaseKey } = getPublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The proxy (proxy.ts) refreshes admin sessions before rendering.
        }
      },
    },
  });
}

export type ServerSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;
