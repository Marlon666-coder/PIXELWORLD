import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Public pages never touch auth cookies; only the admin area needs session refresh.
  matcher: ["/admin", "/admin/:path*"],
};
