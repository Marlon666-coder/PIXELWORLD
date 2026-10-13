"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle, LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/auth";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-ghost btn-sm" disabled={pending}>
      {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <LogOut className="size-4" aria-hidden="true" />}
      {label}
    </button>
  );
}

export function SignOutButton({ label = "Sign out" }: { label?: string }) {
  return (
    <form action={signOut}>
      <SubmitButton label={label} />
    </form>
  );
}
