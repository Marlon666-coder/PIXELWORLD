/**
 * Competition categories.
 *
 * Validation strategy: this list is the single source of truth in the
 * application, and the database enforces the same values with the
 * `competitions_category_check` CHECK constraint (see supabase/migrations).
 * To add a category, append it here AND ship a migration that recreates the
 * constraint with the new value. The integration test suite verifies that the
 * database accepts every value listed here and rejects anything else.
 */
export const CATEGORY_VALUES = [
  "programming",
  "hackathon",
  "ui-ux-design",
  "business",
  "data-science",
  "artificial-intelligence",
  "scientific-writing",
  "photography",
  "graphic-design",
  "other",
] as const;

export type CompetitionCategory = (typeof CATEGORY_VALUES)[number];

export type CategoryAccent = "violet" | "cyan" | "green" | "magenta";

export interface CategoryDefinition {
  value: CompetitionCategory;
  label: string;
  /** Short flavour text used on category tiles. */
  realm: string;
  accent: CategoryAccent;
}

export const CATEGORIES: readonly CategoryDefinition[] = [
  { value: "programming", label: "Programming", realm: "Code forges & algorithm arenas", accent: "cyan" },
  { value: "hackathon", label: "Hackathon", realm: "Build sprints against the clock", accent: "violet" },
  { value: "ui-ux-design", label: "UI/UX Design", realm: "Interfaces, flows & prototypes", accent: "magenta" },
  { value: "business", label: "Business", realm: "Pitches, cases & venture plans", accent: "green" },
  { value: "data-science", label: "Data Science", realm: "Datasets, models & insights", accent: "cyan" },
  { value: "artificial-intelligence", label: "Artificial Intelligence", realm: "Machine learning frontiers", accent: "violet" },
  { value: "scientific-writing", label: "Scientific Writing", realm: "Papers, essays & research", accent: "green" },
  { value: "photography", label: "Photography", realm: "Light, lenses & stories", accent: "magenta" },
  { value: "graphic-design", label: "Graphic Design", realm: "Posters, brands & visuals", accent: "magenta" },
  { value: "other", label: "Other", realm: "Uncharted challenges", accent: "violet" },
];

const CATEGORY_MAP = new Map<string, CategoryDefinition>(CATEGORIES.map((c) => [c.value, c]));

export function isCategory(value: unknown): value is CompetitionCategory {
  return typeof value === "string" && CATEGORY_MAP.has(value);
}

export function getCategory(value: string): CategoryDefinition {
  return CATEGORY_MAP.get(value) ?? CATEGORY_MAP.get("other")!;
}

export function categoryLabel(value: string): string {
  return getCategory(value).label;
}
