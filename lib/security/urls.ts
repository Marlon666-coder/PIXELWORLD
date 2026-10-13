/**
 * URL safety helpers for external registration links and internal redirects.
 */

const MAX_URL_LENGTH = 2048;
const DOMAIN_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

/**
 * Returns a normalized absolute http(s) URL, or null when the input is not a
 * safe public web link. Rejects other schemes (javascript:, data:, file:, ...),
 * embedded credentials, bare hostnames such as "localhost", and IP literals.
 */
export function normalizeExternalUrl(input: string | null | undefined): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  // Punycode hostnames (xn--) still match because URL normalizes IDNs to ASCII.
  if (!DOMAIN_PATTERN.test(url.hostname)) return null;

  return url.toString();
}

export function isSafeExternalUrl(input: string | null | undefined): input is string {
  return normalizeExternalUrl(input) !== null;
}

/** Display form of a link: hostname without "www.". */
export function displayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Validates a post-login redirect target. Only same-origin admin paths are
 * allowed; anything else (absolute URLs, protocol-relative "//evil.com",
 * backslash tricks) falls back to the dashboard.
 */
export function safeAdminRedirect(target: string | null | undefined, fallback = "/admin"): string {
  if (typeof target !== "string" || target.length === 0 || target.length > 512) return fallback;
  if (!target.startsWith("/") || target.startsWith("//") || target.includes("\\")) return fallback;
  // Reject control characters, which browsers may strip to form "//".
  for (let index = 0; index < target.length; index += 1) {
    const code = target.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) return fallback;
  }

  let parsed: URL;
  try {
    parsed = new URL(target, "https://pixel-quest.invalid");
  } catch {
    return fallback;
  }
  if (parsed.origin !== "https://pixel-quest.invalid") return fallback;
  if (parsed.pathname !== "/admin" && !parsed.pathname.startsWith("/admin/")) return fallback;
  if (parsed.pathname === "/admin/login" || parsed.pathname.startsWith("/admin/login/")) return fallback;

  return `${parsed.pathname}${parsed.search}`;
}
