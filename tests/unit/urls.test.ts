import { describe, expect, it } from "vitest";
import { displayHost, isSafeExternalUrl, normalizeExternalUrl, safeAdminRedirect } from "@/lib/security/urls";

describe("normalizeExternalUrl", () => {
  it("accepts public http(s) URLs", () => {
    expect(normalizeExternalUrl("https://example.com/register")).toBe("https://example.com/register");
    expect(normalizeExternalUrl("http://events.example.org/a?b=1#c")).toBe("http://events.example.org/a?b=1#c");
    expect(normalizeExternalUrl("  https://example.com  ")).toBe("https://example.com/");
  });

  it("rejects dangerous schemes", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "file:///etc/passwd",
      "vbscript:msgbox",
      "ftp://example.com/file",
      "mailto:a@b.com",
    ]) {
      expect(normalizeExternalUrl(url)).toBeNull();
    }
  });

  it("rejects embedded credentials, bare hosts and IP literals", () => {
    expect(normalizeExternalUrl("https://user:pass@example.com")).toBeNull();
    expect(normalizeExternalUrl("http://localhost:3000")).toBeNull();
    expect(normalizeExternalUrl("http://127.0.0.1")).toBeNull();
    expect(normalizeExternalUrl("https://192.168.0.1/admin")).toBeNull();
  });

  it("rejects empty, overly long, and non-string input", () => {
    expect(normalizeExternalUrl("")).toBeNull();
    expect(normalizeExternalUrl(null)).toBeNull();
    expect(normalizeExternalUrl(undefined)).toBeNull();
    expect(normalizeExternalUrl(`https://example.com/${"a".repeat(3000)}`)).toBeNull();
  });

  it("isSafeExternalUrl mirrors normalizeExternalUrl", () => {
    expect(isSafeExternalUrl("https://example.com")).toBe(true);
    expect(isSafeExternalUrl("javascript:void(0)")).toBe(false);
  });

  it("displayHost strips www and the scheme", () => {
    expect(displayHost("https://www.example.com/path")).toBe("example.com");
    expect(displayHost("https://sub.example.org")).toBe("sub.example.org");
  });
});

describe("safeAdminRedirect", () => {
  it("allows same-origin admin paths and preserves query", () => {
    expect(safeAdminRedirect("/admin")).toBe("/admin");
    expect(safeAdminRedirect("/admin/competitions/new")).toBe("/admin/competitions/new");
    expect(safeAdminRedirect("/admin?page=2")).toBe("/admin?page=2");
  });

  it("falls back for off-site, protocol-relative and traversal targets", () => {
    expect(safeAdminRedirect("https://evil.com")).toBe("/admin");
    expect(safeAdminRedirect("//evil.com")).toBe("/admin");
    expect(safeAdminRedirect("/admin/../secret")).toBe("/admin");
    expect(safeAdminRedirect("\\admin")).toBe("/admin");
    expect(safeAdminRedirect("/public")).toBe("/admin");
    expect(safeAdminRedirect("javascript:alert(1)")).toBe("/admin");
  });

  it("never redirects back to the login page (avoids loops)", () => {
    expect(safeAdminRedirect("/admin/login")).toBe("/admin");
    expect(safeAdminRedirect("/admin/login?next=/admin")).toBe("/admin");
  });

  it("falls back for empty/invalid input", () => {
    expect(safeAdminRedirect(null)).toBe("/admin");
    expect(safeAdminRedirect("")).toBe("/admin");
    expect(safeAdminRedirect("relative/path")).toBe("/admin");
  });
});
