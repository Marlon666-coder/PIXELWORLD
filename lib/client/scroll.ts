export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Smoothly scrolls to an in-page section (respecting reduced motion) and
 * updates the URL hash without a navigation, preserving any filters in ?query.
 */
export function scrollToSection(id: string): boolean {
  const behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth";
  if (id === "top") {
    window.scrollTo({ top: 0, behavior });
  } else {
    const element = document.getElementById(id);
    if (!element) return false;
    element.scrollIntoView({ behavior, block: "start" });
  }
  const hash = id === "top" ? "" : `#${id}`;
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}${hash}`);
  return true;
}
