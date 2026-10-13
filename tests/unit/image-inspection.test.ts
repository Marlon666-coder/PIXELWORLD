import { describe, expect, it } from "vitest";
import { detectImageType, inspectImage, validatePosterBytes } from "@/lib/images/image-inspection";
import { makeJpegBytes, makePngBytes, makeWebpVp8, makeWebpVp8l } from "./fixtures/images";

const FIVE_MB = 5 * 1024 * 1024;

describe("detectImageType", () => {
  it("detects supported formats from magic bytes", () => {
    expect(detectImageType(makePngBytes(10, 10))).toBe("image/png");
    expect(detectImageType(makeJpegBytes(10, 10))).toBe("image/jpeg");
    expect(detectImageType(makeWebpVp8(10, 10))).toBe("image/webp");
    expect(detectImageType(makeWebpVp8l(10, 10))).toBe("image/webp");
  });

  it("rejects non-image and spoofed content", () => {
    expect(detectImageType(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBeNull(); // PDF
    expect(detectImageType(new TextEncoder().encode("<svg></svg>"))).toBeNull();
    expect(detectImageType(new TextEncoder().encode("GIF89a"))).toBeNull(); // GIF not allowed
    expect(detectImageType(new Uint8Array([0x00, 0x01, 0x02]))).toBeNull();
  });
});

describe("inspectImage dimensions", () => {
  it("reads PNG dimensions", () => {
    expect(inspectImage(makePngBytes(640, 480))).toMatchObject({ mimeType: "image/png", width: 640, height: 480 });
  });

  it("reads JPEG dimensions", () => {
    expect(inspectImage(makeJpegBytes(800, 1200))).toMatchObject({ mimeType: "image/jpeg", width: 800, height: 1200 });
  });

  it("applies EXIF orientation 6 (swaps width/height)", () => {
    expect(inspectImage(makeJpegBytes(800, 1200, 6))).toMatchObject({ width: 1200, height: 800 });
  });

  it("keeps dimensions for EXIF orientation 1", () => {
    expect(inspectImage(makeJpegBytes(800, 1200, 1))).toMatchObject({ width: 800, height: 1200 });
  });

  it("reads WebP (VP8 and VP8L) dimensions", () => {
    expect(inspectImage(makeWebpVp8(1024, 768))).toMatchObject({ mimeType: "image/webp", width: 1024, height: 768 });
    expect(inspectImage(makeWebpVp8l(300, 500))).toMatchObject({ mimeType: "image/webp", width: 300, height: 500 });
  });
});

describe("validatePosterBytes", () => {
  it("accepts a valid image within limits", () => {
    const result = validatePosterBytes(makePngBytes(1080, 1350), FIVE_MB);
    expect(result.ok).toBe(true);
  });

  it("rejects empty files", () => {
    const result = validatePosterBytes(new Uint8Array(0), FIVE_MB);
    expect(result).toMatchObject({ ok: false });
  });

  it("rejects files over the size limit", () => {
    const big = new Uint8Array(FIVE_MB + 1);
    big.set(makePngBytes(10, 10));
    const result = validatePosterBytes(big, FIVE_MB);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.reason).toMatch(/larger/i);
  });

  it("rejects content that is not a supported image, regardless of claimed type", () => {
    const result = validatePosterBytes(new TextEncoder().encode("not an image at all"), FIVE_MB);
    expect(result).toMatchObject({ ok: false });
  });

  it("rejects absurdly large dimensions (decompression-bomb guard)", () => {
    const result = validatePosterBytes(makePngBytes(50_000, 50_000), FIVE_MB);
    expect(result).toMatchObject({ ok: false });
  });
});
