/**
 * Absolute base URL used for metadata (Open Graph, canonical links).
 * Order: explicit NEXT_PUBLIC_SITE_URL → Vercel production domain → localhost.
 */
export function getSiteUrl(): URL {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return new URL(candidate);
    } catch {
      // try the next candidate
    }
  }
  return new URL("http://localhost:3000");
}
