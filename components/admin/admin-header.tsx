"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, HardDrive, LayoutDashboard, Plus } from "lucide-react";
import { PixelLogo } from "@/components/brand/pixel-logo";
import { cn } from "@/lib/utils";
import { SignOutButton } from "./sign-out-button";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/competitions/new", label: "New quest", icon: Plus, exact: true },
  { href: "/admin/storage", label: "Storage", icon: HardDrive, exact: false },
];

export function AdminHeader({ email }: { email: string | null }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-void-950/92 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/admin" aria-label="Admin dashboard">
            <PixelLogo />
          </Link>
          <span className="bg-neon-violet/15 px-2 py-0.5 font-mono text-[10px] tracking-[0.2em] text-neon-violet uppercase">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          {email && <span className="hidden max-w-56 truncate font-mono text-xs text-mist md:inline">{email}</span>}
          <SignOutButton />
        </div>
        <nav aria-label="Admin" className="-mx-1 flex w-full gap-1 overflow-x-auto px-1 pb-1">
          {LINKS.map((link) => {
            const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 px-3 py-2 font-mono text-xs tracking-[0.16em] uppercase transition-colors",
                  active ? "bg-white/8 text-ink" : "text-mist hover:text-ink",
                )}
              >
                <link.icon className="size-4" aria-hidden="true" />
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/"
            className="ml-auto inline-flex shrink-0 items-center gap-2 px-3 py-2 font-mono text-xs tracking-[0.16em] text-mist uppercase hover:text-ink"
          >
            View site
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
