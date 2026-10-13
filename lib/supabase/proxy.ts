import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readPublicEnv } from "@/lib/env";
import type { Database } from "./database.types";

const LOGIN_PATH = "/admin/login";

/**
 * Refreshes the Supabase session cookie for admin routes and redirects
 * visitors without a session to the login page. This is an optimistic,
 * UX-level check only: every admin page and Server Action re-verifies the
 * user AND their administrator role, and Row Level Security enforces it again
 * in the database.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const env = readPublicEnv();
  if (!env.ok) {
    // Pages render a setup screen when configuration is missing.
    return response;
  }

  const supabase = createServerClient<Database>(env.env.supabaseUrl, env.env.supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        // Responses that set auth cookies must never be cached by a CDN.
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Do not run code between createServerClient and getClaims(): it refreshes the session.
  const { data } = await supabase.auth.getClaims();
  const hasSession = Boolean(data?.claims?.sub);

  const { pathname, search } = request.nextUrl;
  const isLoginPage = pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`);

  if (!hasSession && !isLoginPage) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = LOGIN_PATH;
    loginUrl.search = "";
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    const redirect = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    redirect.headers.set("Cache-Control", "private, no-store");
    return redirect;
  }

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
