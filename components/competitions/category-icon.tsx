import {
  BrainCircuit,
  Briefcase,
  Camera,
  ChartColumn,
  Code,
  Compass,
  FlaskConical,
  Palette,
  PenTool,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import type { CategoryAccent, CompetitionCategory } from "@/lib/categories";

const ICONS: Record<CompetitionCategory, LucideIcon> = {
  programming: Code,
  hackathon: Rocket,
  "ui-ux-design": PenTool,
  business: Briefcase,
  "data-science": ChartColumn,
  "artificial-intelligence": BrainCircuit,
  "scientific-writing": FlaskConical,
  photography: Camera,
  "graphic-design": Palette,
  other: Compass,
};

export function CategoryIcon({ category, className }: { category: CompetitionCategory; className?: string }) {
  const Icon = ICONS[category] ?? Compass;
  return <Icon className={className} aria-hidden="true" />;
}

export const ACCENT_TEXT: Record<CategoryAccent, string> = {
  violet: "text-neon-violet",
  cyan: "text-neon-cyan",
  green: "text-neon-green",
  magenta: "text-neon-magenta",
};

export const ACCENT_GLOW: Record<CategoryAccent, string> = {
  violet: "from-neon-violet/25",
  cyan: "from-neon-cyan/20",
  green: "from-neon-green/18",
  magenta: "from-neon-magenta/20",
};
