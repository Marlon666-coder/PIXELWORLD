import "server-only";

import { ORPHAN_GRACE_PERIOD_MS, POSTER_BUCKET, POSTER_MAX_BYTES } from "@/lib/config";
import { validatePosterBytes, type ImageInfo } from "@/lib/images/image-inspection";
import { isPosterPath, POSTER_FOLDER, posterPathMatchesType } from "@/lib/images/poster-storage";
import type { ServerSupabaseClient } from "@/lib/supabase/server";

export type VerifiedPoster = { ok: true; path: string; info: ImageInfo } | { ok: false; reason: string };

/**
 * Server-side verification of an uploaded poster. The browser already checked
 * the file, but nothing from the client is trusted: the object is downloaded
 * and its real signature, size and dimensions are validated here.
 */
export async function verifyUploadedPoster(supabase: ServerSupabaseClient, path: string): Promise<VerifiedPoster> {
  if (!isPosterPath(path)) {
    return { ok: false, reason: "Invalid poster reference. Please upload the poster again." };
  }

  const { data, error } = await supabase.storage.from(POSTER_BUCKET).download(path);
  if (error || !data) {
    return { ok: false, reason: "The uploaded poster could not be found. Please upload it again." };
  }

  const bytes = new Uint8Array(await data.arrayBuffer());
  const result = validatePosterBytes(bytes, POSTER_MAX_BYTES);
  if (!result.ok) return result;
  if (!posterPathMatchesType(path, result.info.mimeType)) {
    return { ok: false, reason: "The poster's content does not match its file type." };
  }
  return { ok: true, path, info: result.info };
}

export type RemovalResult = { ok: true } | { ok: false; reason: string };

/** Deletes a poster object and confirms Storage actually removed it. */
export async function removePosterObject(supabase: ServerSupabaseClient, path: string): Promise<RemovalResult> {
  if (!isPosterPath(path)) return { ok: false, reason: "Invalid poster path." };
  const { data, error } = await supabase.storage.from(POSTER_BUCKET).remove([path]);
  if (error) {
    console.error("[storage] poster removal failed", { path, message: error.message });
    return { ok: false, reason: "Storage rejected the deletion." };
  }
  if (!data || data.length === 0) {
    return { ok: false, reason: "Storage did not confirm the deletion." };
  }
  return { ok: true };
}

/** True when any competition row still references this poster path. */
export async function isPosterReferenced(supabase: ServerSupabaseClient, path: string): Promise<boolean | null> {
  const { count, error } = await supabase
    .from("competitions")
    .select("id", { count: "exact", head: true })
    .eq("poster_path", path);
  if (error) return null;
  return (count ?? 0) > 0;
}

/**
 * Best-effort cleanup for a freshly uploaded poster whose database write failed.
 * Never deletes an object that a competition references.
 */
export async function discardUnreferencedPoster(supabase: ServerSupabaseClient, path: string | null): Promise<void> {
  if (!path || !isPosterPath(path)) return;
  const referenced = await isPosterReferenced(supabase, path);
  if (referenced !== false) return;
  await removePosterObject(supabase, path);
}

export interface StoredPoster {
  path: string;
  size: number | null;
  createdAt: string | null;
  isRecent: boolean;
}

const LIST_PAGE_SIZE = 1000;

/** Lists every object in the posters folder (paginated under the hood). */
export async function listStoredPosters(
  supabase: ServerSupabaseClient,
  now: Date = new Date(),
): Promise<{ ok: true; data: StoredPoster[] } | { ok: false; error: string }> {
  const objects: StoredPoster[] = [];
  for (let offset = 0; ; offset += LIST_PAGE_SIZE) {
    const { data, error } = await supabase.storage.from(POSTER_BUCKET).list(POSTER_FOLDER, {
      limit: LIST_PAGE_SIZE,
      offset,
      sortBy: { column: "created_at", order: "asc" },
    });
    if (error) {
      console.error("[storage] list failed", { message: error.message });
      return { ok: false, error: "Could not list poster files." };
    }
    for (const item of data ?? []) {
      if (!item.id) continue; // folders
      const createdAt = item.created_at ?? null;
      const createdMs = createdAt ? Date.parse(createdAt) : NaN;
      const size = typeof item.metadata?.size === "number" ? item.metadata.size : null;
      objects.push({
        path: `${POSTER_FOLDER}/${item.name}`,
        size,
        createdAt,
        isRecent: Number.isNaN(createdMs) ? true : now.getTime() - createdMs < ORPHAN_GRACE_PERIOD_MS,
      });
    }
    if (!data || data.length < LIST_PAGE_SIZE) break;
  }
  return { ok: true, data: objects };
}

/** Poster objects not referenced by any competition (candidates for cleanup). */
export async function findOrphanedPosters(
  supabase: ServerSupabaseClient,
  now: Date = new Date(),
): Promise<{ ok: true; data: StoredPoster[] } | { ok: false; error: string }> {
  const stored = await listStoredPosters(supabase, now);
  if (!stored.ok) return stored;

  const { data, error } = await supabase.from("competitions").select("poster_path").not("poster_path", "is", null);
  if (error) {
    return { ok: false, error: "Could not read poster references." };
  }
  const referenced = new Set((data ?? []).map((row) => row.poster_path));
  return { ok: true, data: stored.data.filter((object) => !referenced.has(object.path)) };
}
