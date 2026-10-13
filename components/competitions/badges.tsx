import type { CategoryDefinition } from "@/lib/categories";
import { DEADLINE_STATUS_LABELS, type DeadlineStatus } from "@/lib/competitions/deadline";
import { cn } from "@/lib/utils";
import { ACCENT_TEXT, CategoryIcon } from "./category-icon";

export function CategoryBadge({ category, className }: { category: CategoryDefinition; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 bg-void-950/85 px-2.5 py-1 font-mono text-[10px] tracking-[0.16em] uppercase",
        ACCENT_TEXT[category.accent],
        className,
      )}
    >
      <CategoryIcon category={category.value} className="size-3.5" />
      {category.label}
    </span>
  );
}

const STATUS_STYLES: Record<DeadlineStatus, { dot: string; text: string }> = {
  open: { dot: "bg-neon-green shadow-[0_0_8px_#4cf08a]", text: "text-neon-green" },
  "closing-soon": { dot: "bg-neon-magenta shadow-[0_0_8px_#f062e6] animate-pulse-soft", text: "text-neon-magenta" },
  closed: { dot: "bg-mist-dim", text: "text-mist" },
  unspecified: { dot: "bg-mist/60", text: "text-mist" },
};

export function DeadlineBadge({ status, className }: { status: DeadlineStatus; className?: string }) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 bg-void-950/85 px-2.5 py-1 font-mono text-[10px] tracking-[0.16em] uppercase",
        style.text,
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5", style.dot)} />
      {DEADLINE_STATUS_LABELS[status]}
    </span>
  );
}

export function PublicationBadge({ status }: { status: "draft" | "published" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 font-mono text-[10px] tracking-[0.16em] uppercase",
        status === "published" ? "bg-neon-green/12 text-neon-green" : "bg-white/8 text-mist",
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5", status === "published" ? "bg-neon-green" : "bg-mist")} />
      {status === "published" ? "Published" : "Draft"}
    </span>
  );
}
