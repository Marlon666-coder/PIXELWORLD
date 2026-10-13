/**
 * Content-based image validation. File extensions and declared MIME types are
 * never trusted: the first bytes ("magic numbers") identify the format, and the
 * image header is parsed to read the real pixel dimensions.
 */

export const POSTER_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type PosterMimeType = (typeof POSTER_MIME_TYPES)[number];

export const POSTER_EXTENSIONS: Record<PosterMimeType, "jpg" | "png" | "webp"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Upper bounds that protect the image optimizer from decompression bombs. */
export const MAX_POSTER_DIMENSION = 12_000;
export const MAX_POSTER_PIXELS = 60_000_000;

export function isPosterMimeType(value: unknown): value is PosterMimeType {
  return typeof value === "string" && (POSTER_MIME_TYPES as readonly string[]).includes(value);
}

export interface ImageInfo {
  mimeType: PosterMimeType;
  /** Display width (EXIF orientation applied for JPEG). */
  width: number;
  /** Display height (EXIF orientation applied for JPEG). */
  height: number;
}

const ascii = (bytes: Uint8Array, start: number, length: number): string =>
  String.fromCharCode(...bytes.subarray(start, start + length));

export function detectImageType(bytes: Uint8Array): PosterMimeType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    ascii(bytes, 1, 3) === "PNG" &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return "image/webp";
  }
  return null;
}

interface Dimensions {
  width: number;
  height: number;
}

function readPngDimensions(bytes: Uint8Array): Dimensions | null {
  if (bytes.length < 24 || ascii(bytes, 12, 4) !== "IHDR") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function readWebpDimensions(bytes: Uint8Array): Dimensions | null {
  if (bytes.length < 30) return null;
  const chunk = ascii(bytes, 12, 4);
  if (chunk === "VP8 ") {
    // Lossy bitstream: 3-byte frame tag, then start code 9D 01 2A.
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null;
    const width = (bytes[26] | (bytes[27] << 8)) & 0x3fff;
    const height = (bytes[28] | (bytes[29] << 8)) & 0x3fff;
    return { width, height };
  }
  if (chunk === "VP8L") {
    if (bytes[20] !== 0x2f) return null;
    const b0 = bytes[21];
    const b1 = bytes[22];
    const b2 = bytes[23];
    const b3 = bytes[24];
    const width = 1 + (((b1 & 0x3f) << 8) | b0);
    const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
    return { width, height };
  }
  if (chunk === "VP8X") {
    const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
    const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
    return { width, height };
  }
  return null;
}

/** Reads the EXIF orientation (1-8) from an APP1 segment payload, or null. */
function readExifOrientation(bytes: Uint8Array, start: number, end: number): number | null {
  if (end - start < 14 || ascii(bytes, start, 6) !== "Exif\0\0") return null;
  const tiff = start + 6;
  const byteOrder = ascii(bytes, tiff, 2);
  const little = byteOrder === "II";
  if (!little && byteOrder !== "MM") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint16(tiff + 2, little) !== 42) return null;
  const ifdOffset = view.getUint32(tiff + 4, little);
  const ifd = tiff + ifdOffset;
  if (ifd + 2 > end) return null;
  const entries = view.getUint16(ifd, little);
  for (let index = 0; index < entries; index += 1) {
    const entry = ifd + 2 + index * 12;
    if (entry + 12 > end) return null;
    if (view.getUint16(entry, little) === 0x0112) {
      const orientation = view.getUint16(entry + 8, little);
      return orientation >= 1 && orientation <= 8 ? orientation : null;
    }
  }
  return null;
}

function readJpegDimensions(bytes: Uint8Array): Dimensions | null {
  let offset = 2;
  let orientation: number | null = null;

  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    let marker = bytes[offset + 1];
    // Skip fill bytes (0xFF padding before a marker).
    while (marker === 0xff && offset + 2 < bytes.length) {
      offset += 1;
      marker = bytes[offset + 1];
    }
    // Standalone markers without a length field.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) return null; // EOI / start of scan before a frame header.

    const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (segmentLength < 2) return null;
    const payloadStart = offset + 4;
    const segmentEnd = offset + 2 + segmentLength;

    if (marker === 0xe1 && orientation === null) {
      orientation = readExifOrientation(bytes, payloadStart, Math.min(segmentEnd, bytes.length));
    }

    const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isStartOfFrame) {
      if (payloadStart + 5 > bytes.length) return null;
      const height = (bytes[payloadStart + 1] << 8) | bytes[payloadStart + 2];
      const width = (bytes[payloadStart + 3] << 8) | bytes[payloadStart + 4];
      // Orientations 5-8 rotate the image by 90°, swapping display dimensions.
      return orientation !== null && orientation >= 5 ? { width: height, height: width } : { width, height };
    }

    offset = segmentEnd;
  }
  return null;
}

/** Identifies a JPEG/PNG/WebP image from its bytes and returns its display dimensions. */
export function inspectImage(bytes: Uint8Array): ImageInfo | null {
  const mimeType = detectImageType(bytes);
  if (!mimeType) return null;

  const dimensions =
    mimeType === "image/png"
      ? readPngDimensions(bytes)
      : mimeType === "image/webp"
        ? readWebpDimensions(bytes)
        : readJpegDimensions(bytes);

  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) return null;
  return { mimeType, width: dimensions.width, height: dimensions.height };
}

export type PosterValidationResult =
  | { ok: true; info: ImageInfo }
  | { ok: false; reason: string };

/** Full poster validation: real format, size limit, and sane dimensions. */
export function validatePosterBytes(bytes: Uint8Array, maxBytes: number): PosterValidationResult {
  if (bytes.length === 0) return { ok: false, reason: "The poster file is empty." };
  if (bytes.length > maxBytes) {
    return { ok: false, reason: `The poster is larger than the ${Math.round(maxBytes / 1024 / 1024)} MB limit.` };
  }
  const info = inspectImage(bytes);
  if (!info) {
    return { ok: false, reason: "The file is not a valid JPEG, PNG, or WebP image." };
  }
  if (
    info.width > MAX_POSTER_DIMENSION ||
    info.height > MAX_POSTER_DIMENSION ||
    info.width * info.height > MAX_POSTER_PIXELS
  ) {
    return { ok: false, reason: `Poster dimensions ${info.width}×${info.height} exceed the supported maximum.` };
  }
  return { ok: true, info };
}
