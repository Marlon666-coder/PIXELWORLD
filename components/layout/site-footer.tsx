import Link from "next/link";
import { PixelLogo } from "@/components/brand/pixel-logo";
import { SITE } from "@/lib/config";

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-white/8 bg-void-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-12 sm:px-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-sm space-y-3">
          <PixelLogo />
          <p className="text-sm leading-relaxed text-mist">{SITE.tagline}</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-3 font-mono text-xs tracking-[0.2em] text-mist uppercase">
          <Link className="hover:text-ink" href="/#explore">
            Explore
          </Link>
          <Link className="hover:text-ink" href="/#categories">
            Categories
          </Link>
          <Link className="hover:text-ink" href="/about">
            About
          </Link>
          <Link className="hover:text-ink" href="/admin/login">
            Admin
          </Link>
        </nav>
      </div>
      <div className="border-t border-white/5">
        <p className="mx-auto max-w-7xl px-5 py-5 font-mono text-[11px] tracking-[0.18em] text-mist-dim uppercase sm:px-8">
          © {new Date().getFullYear()} {SITE.name} · Competitions are listed by the site administrators
        </p>
      </div>
    </footer>
  );
}
