"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/** Re-runs the server render (and therefore the failed database request). */
export function RetryButton({ className, label = "Retry" }: { className?: string; label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className={cn("btn btn-secondary", className)}
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      <RefreshCw className={cn("size-4", pending && "animate-spin")} aria-hidden="true" />
      {pending ? "Retrying…" : label}
    </button>
  );
}
