import type { NextConfig } from "next";

const POSTER_BUCKET = "competition-posters";

function parseSupabaseUrl(): URL | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

const supabaseUrl = parseSupabaseUrl();
const isDevelopment = process.env.NODE_ENV !== "production";
const isVercelPreview = process.env.VERCEL_ENV === "preview";
const isLocalSupabase =
  supabaseUrl !== null && ["127.0.0.1", "localhost", "0.0.0.0"].includes(supabaseUrl.hostname);

function buildContentSecurityPolicy(): string {
  const supabaseOrigin = supabaseUrl?.origin ?? "";
  const supabaseSocket = supabaseOrigin.replace(/^http/, "ws");
  const vercelLive = isVercelPreview ? " https://vercel.live" : "";

  const directives: Record<string, string> = {
    "default-src": "'self'",
    // Next.js injects inline bootstrap scripts; 'unsafe-eval' is only needed by the dev server.
    "script-src": `'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}${vercelLive}`,
    "style-src": "'self' 'unsafe-inline'",
    "img-src": `'self' data: blob: ${supabaseOrigin}${vercelLive}`.trim(),
    "font-src": "'self'",
    "connect-src": `'self' ${supabaseOrigin} ${supabaseSocket}${vercelLive}`.trim(),
    "frame-src": isVercelPreview ? "https://vercel.live" : "'none'",
    "frame-ancestors": "'none'",
    "base-uri": "'self'",
    "form-action": "'self'",
    "object-src": "'none'",
    "worker-src": "'self' blob:",
  };

  return Object.entries(directives)
    .map(([directive, value]) => `${directive} ${value}`)
    .join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: buildContentSecurityPolicy() },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: supabaseUrl
      ? [
          {
            protocol: supabaseUrl.protocol === "http:" ? "http" : "https",
            hostname: supabaseUrl.hostname,
            port: supabaseUrl.port,
            pathname: `/storage/v1/object/public/${POSTER_BUCKET}/**`,
          },
        ]
      : [],
    // Poster objects are immutable (every upload gets a new unique path), so
    // optimized variants can be cached for a long time.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Only a local Supabase (development / CI) lives on a loopback address.
    dangerouslyAllowLocalIP: isLocalSupabase,
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
