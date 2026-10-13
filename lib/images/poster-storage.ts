import { POSTER_BUCKET } from "@/lib/config";
import { POSTER_EXTENSIONS, type PosterMimeType } from "./image-inspection";

/**
 * Poster objects live at `posters/<uuid>.<ext>` inside the bucket. Paths are
 * generated on the server, never reused, and never overwritten (uploads use
 * upsert=false), so one competition can never clobber another's poster.
 */
export const POSTER_FOLDER = "posters";

const POSTER_PATH_PATTERN =
  /^posters\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/;

export function createPosterPath(mimeType: PosterMimeType, uuid: string = crypto.randomUUID()): string {
  return `${POSTER_FOLDER}/${uuid.toLowerCase()}.${POSTER_EXTENSIONS[mimeType]}`;
}

export function isPosterPath(path: unknown): path is string {
  return typeof path === "string" && POSTER_PATH_PATTERN.test(path);
}

export function posterPathMatchesType(path: string, mimeType: PosterMimeType): boolean {
  return path.endsWith(`.${POSTER_EXTENSIONS[mimeType]}`);
}

/** Public URL of a poster object (the bucket is public-read; writes are admin-only). */
export function getPosterPublicUrl(supabaseUrl: string, path: string): string {
  const base = supabaseUrl.replace(/\/+$/, "");
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/public/${POSTER_BUCKET}/${encodedPath}`;
}
