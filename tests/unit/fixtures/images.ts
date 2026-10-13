/**
 * Minimal, hand-built image byte sequences for format/dimension detection tests.
 * These contain just enough header structure for the inspector to parse; they are
 * not full renderable images, which keeps the fixtures tiny and dependency-free.
 */

export function makePngBytes(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0); // signature
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13); // IHDR length
  bytes.set([0x49, 0x48, 0x44, 0x52], 12); // "IHDR"
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

/** Baseline JPEG: SOI, optional APP1/EXIF orientation, then an SOF0 frame header. */
export function makeJpegBytes(width: number, height: number, orientation?: number): Uint8Array {
  const parts: number[] = [0xff, 0xd8]; // SOI

  if (orientation !== undefined) {
    // APP1 with a little-endian TIFF header carrying one IFD entry (orientation).
    const tiff: number[] = [
      0x49, 0x49, 0x2a, 0x00, // "II", 42
      0x08, 0x00, 0x00, 0x00, // IFD offset = 8
      0x01, 0x00, // entry count = 1
      0x12, 0x01, // tag 0x0112 (orientation)
      0x03, 0x00, // type SHORT
      0x01, 0x00, 0x00, 0x00, // count 1
      orientation & 0xff, 0x00, 0x00, 0x00, // value
    ];
    const payload = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff]; // "Exif\0\0" + TIFF
    const length = payload.length + 2;
    parts.push(0xff, 0xe1, (length >> 8) & 0xff, length & 0xff, ...payload);
  }

  // SOF0: marker, length(17), precision, height, width, components(1)...
  parts.push(0xff, 0xc0, 0x00, 0x11, 0x08, (height >> 8) & 0xff, height & 0xff, (width >> 8) & 0xff, width & 0xff, 0x01, 0x01, 0x11, 0x00);
  return new Uint8Array(parts);
}

function riff(chunkName: string, chunkBytes: number[]): Uint8Array {
  const body = [...Array.from("WEBP").map((c) => c.charCodeAt(0)), ...Array.from(chunkName).map((c) => c.charCodeAt(0))];
  const header = [...Array.from("RIFF").map((c) => c.charCodeAt(0)), 0, 0, 0, 0];
  return new Uint8Array([...header, ...body, ...chunkBytes]);
}

/** Lossy WebP (VP8). */
export function makeWebpVp8(width: number, height: number): Uint8Array {
  const w = (width - 1) & 0x3fff;
  const h = (height - 1) & 0x3fff;
  // 3-byte frame tag + 3-byte start code (0x9d 0x01 0x2a) + 2-byte width + 2-byte height.
  // Encoder stores width/height directly (not width-1) in the 14-bit fields read by the parser.
  const chunk = [
    0, 0, 0, 0, // chunk size (ignored by parser)
    0x00, 0x00, 0x00, // frame tag
    0x9d, 0x01, 0x2a, // start code
    width & 0xff, (width >> 8) & 0x3f,
    height & 0xff, (height >> 8) & 0x3f,
  ];
  void w;
  void h;
  return riff("VP8 ", chunk);
}

/** Lossless WebP (VP8L). */
export function makeWebpVp8l(width: number, height: number): Uint8Array {
  const w = width - 1;
  const h = height - 1;
  const b0 = w & 0xff;
  const b1 = ((w >> 8) & 0x3f) | ((h & 0x03) << 6);
  const b2 = (h >> 2) & 0xff;
  const b3 = (h >> 10) & 0x0f;
  // Pad past byte 30 so the inspector's minimum-length guard passes.
  const chunk = [0, 0, 0, 0, 0x2f, b0, b1, b2, b3, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  return riff("VP8L", chunk);
}
