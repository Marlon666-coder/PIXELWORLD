import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck, TriangleAlert } from "lucide-react";
import { LoginForm } from "@/components/admin/login-form";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { PixelLogo } from "@/components/brand/pixel-logo";
import { SetupNotice } from "@/components/competitions/gallery-states";
import { getAdminContext } from "@/lib/auth/admin";
import { readPublicEnv } from "@/lib/env";
import { safeAdminRedirect } from "@/lib/security/urls";

export const metadata: Metadata = { title: "Admin login" };

export default async function AdminLoginPage(props: PageProps<"/admin/login">) {
  const searchParams = await props.searchParams;
  const nextParam = typeof searchParams.next === "string" ? searchParams.next : undefined;
  const next = safeAdminRedirect(nextParam);
  const env = readPublicEnv();

  let signedInWithoutAccess: string | null = null;
  if (env.ok) {
    const context = await getAdminContext();
    if (context.status === "admin") redirect(next);
    if (context.status === "forbidden") signedInWithoutAccess = context.user.email ?? "this account";
  }

  return (
    <main id="main" className="flex min-h-svh flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="btn btn-ghost btn-sm -ml-3 mb-6">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to site
        </Link>

        <div className="panel scanlines p-6 sm:p-9">
          <PixelLogo />
          <p className="hud-label mt-8 flex items-center gap-2 text-neon-cyan">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Restricted terminal
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold">ADMIN LOGIN</h1>
          <p className="mt-2 text-sm text-mist">Sign in with an administrator account to manage competitions.</p>

          <div className="mt-8">
            {!env.ok ? (
              <SetupNotice problems={env.problems} />
            ) : signedInWithoutAccess ? (
              <div role="alert" className="space-y-4">
                <p className="flex items-start gap-3 border-l-4 border-neon-magenta bg-neon-magenta/10 p-3.5 text-sm">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-neon-magenta" aria-hidden="true" />
                  You are signed in as {signedInWithoutAccess}, which is not an administrator account.
                </p>
                <SignOutButton label="Sign out and switch account" />
              </div>
            ) : (
              <LoginForm next={next} />
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-mist-dim">
          There is no public sign-up. Administrator accounts are provisioned by the site owner.
        </p>
      </div>
    </main>
  );
}
