"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { PageBackdrop } from "@/components/layout/page-backdrop";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="relative flex min-h-[85vh] items-center justify-center px-5 py-24">
      <PageBackdrop />
      <div role="alert" className="panel scanlines w-full max-w-xl px-6 py-14 text-center sm:px-12">
        <p className="hud-label text-danger">System glitch</p>
        <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">SOMETHING BROKE</h1>
        <p className="mt-4 text-mist">An unexpected error interrupted this level. You can try again or head back to base.</p>
        {error.digest && <p className="mt-3 font-mono text-xs text-mist-dim">Reference: {error.digest}</p>}
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={reset} className="btn btn-primary">
            <RefreshCw className="size-4" aria-hidden="true" />
            Try again
          </button>
          <Link href="/" className="btn btn-secondary">
            Back to base
          </Link>
        </div>
      </div>
    </main>
  );
}
