/**
 * Public Supabase configuration.
 *
 * Only the project URL and the publishable (or legacy anon) key are needed by
 * the application. Both are designed to be public; data access is protected by
 * Row Level Security. The service role / secret key is NOT used by the app.
 */

export interface PublicSupabaseEnv {
  supabaseUrl: string;
  supabaseKey: string;
}

export type PublicEnvResult =
  | { ok: true; env: PublicSupabaseEnv }
  | { ok: false; problems: string[] };

interface RawEnv {
  url: string | undefined;
  publishableKey: string | undefined;
  anonKey: string | undefined;
}

export function parsePublicEnv(raw: RawEnv): PublicEnvResult {
  const problems: string[] = [];
  const url = raw.url?.trim();
  const key = raw.publishableKey?.trim() || raw.anonKey?.trim();

  if (!url) {
    problems.push("NEXT_PUBLIC_SUPABASE_URL is not set.");
  } else {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        problems.push("NEXT_PUBLIC_SUPABASE_URL must start with https:// (or http:// for local development).");
      }
    } catch {
      problems.push("NEXT_PUBLIC_SUPABASE_URL is not a valid URL.");
    }
  }

  if (!key) {
    problems.push(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set (the legacy NEXT_PUBLIC_SUPABASE_ANON_KEY is also accepted).",
    );
  }

  if (problems.length > 0 || !url || !key) {
    return { ok: false, problems };
  }

  return { ok: true, env: { supabaseUrl: url.replace(/\/+$/, ""), supabaseKey: key } };
}

/** Reads the public Supabase configuration. Works on the server and in the browser. */
export function readPublicEnv(): PublicEnvResult {
  return parsePublicEnv({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

export class MissingConfigurationError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(`PIXEL QUEST is not configured: ${problems.join(" ")}`);
    this.name = "MissingConfigurationError";
    this.problems = problems;
  }
}

/** Returns the public Supabase configuration or throws a descriptive setup error. */
export function getPublicEnv(): PublicSupabaseEnv {
  const result = readPublicEnv();
  if (!result.ok) {
    throw new MissingConfigurationError(result.problems);
  }
  return result.env;
}

export function isMissingConfigurationError(error: unknown): error is MissingConfigurationError {
  return error instanceof MissingConfigurationError;
}
