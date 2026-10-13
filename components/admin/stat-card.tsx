import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  hint,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  accent: "violet" | "cyan" | "green" | "magenta";
  hint?: string;
}) {
  const accentClass = {
    violet: "text-neon-violet",
    cyan: "text-neon-cyan",
    green: "text-neon-green",
    magenta: "text-neon-magenta",
  }[accent];

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="hud-label">{label}</p>
        <Icon className={cn("size-5", accentClass)} aria-hidden="true" />
      </div>
      <p className="mt-3 font-display text-5xl leading-none font-bold text-ink" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-mist-dim">{hint}</p>}
    </div>
  );
}
