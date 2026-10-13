"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { Menu, X } from "lucide-react";
import { PixelLogo } from "@/components/brand/pixel-logo";
import { scrollToSection } from "@/lib/client/scroll";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", section: "top" },
  { label: "Explore", href: "/#explore", section: "explore" },
  { label: "Categories", href: "/#categories", section: "categories" },
  { label: "About", href: "/about" },
];

const OBSERVED_SECTIONS = ["top", "explore", "categories"];

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("top");
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!isHome || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: [0, 0.25, 0.5] },
    );
    OBSERVED_SECTIONS.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [isHome]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const handleNavigate = (event: MouseEvent<HTMLAnchorElement>, item: NavItem) => {
    setOpen(false);
    if (!isHome || !item.section) return;
    if (scrollToSection(item.section)) event.preventDefault();
  };

  const isActive = (item: NavItem) =>
    item.section ? isHome && activeSection === item.section : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <nav
        aria-label="Main"
        className={cn(
          "glass pixel-border mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 transition-colors duration-300 sm:px-5",
          scrolled && "bg-void-900/80",
        )}
      >
        <Link href="/" onClick={(event) => handleNavigate(event, NAV_ITEMS[0])} className="py-1" aria-label="PIXEL QUEST home">
          <PixelLogo />
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                onClick={(event) => handleNavigate(event, item)}
                aria-current={isActive(item) ? "page" : undefined}
                className={cn(
                  "relative px-3.5 py-2 font-mono text-xs tracking-[0.2em] uppercase transition-colors",
                  isActive(item) ? "text-ink" : "text-mist hover:text-ink",
                )}
              >
                {isActive(item) && <span aria-hidden="true" className="absolute inset-x-3.5 -bottom-0.5 h-0.5 bg-neon-cyan" />}
                {item.label}
              </Link>
            </li>
          ))}
          <li className="ml-2">
            <Link href="/admin/login" className="btn btn-secondary btn-sm">
              Admin Login
            </Link>
          </li>
        </ul>

        <button
          ref={toggleRef}
          type="button"
          className="btn btn-ghost btn-sm lg:hidden"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        </button>
      </nav>

      <div
        id={menuId}
        hidden={!open}
        className="glass pixel-border mx-auto mt-2 max-w-7xl px-3 py-3 lg:hidden"
      >
        <ul className="flex flex-col">
          {NAV_ITEMS.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                onClick={(event) => handleNavigate(event, item)}
                aria-current={isActive(item) ? "page" : undefined}
                className={cn(
                  "flex min-h-12 items-center px-3 font-mono text-sm tracking-[0.2em] uppercase",
                  isActive(item) ? "text-neon-cyan" : "text-ink",
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
          <li className="mt-2 px-1">
            <Link href="/admin/login" onClick={() => setOpen(false)} className="btn btn-secondary w-full">
              Admin Login
            </Link>
          </li>
        </ul>
      </div>
    </header>
  );
}
