import type { Metadata } from "next";
import { StorageCleanup, type OrphanRow } from "@/components/admin/storage-cleanup";
import { GalleryError } from "@/components/competitions/gallery-states";
import { requireAdminPage } from "@/lib/auth/admin";
import { SITE_TIME_ZONE } from "@/lib/config";
import { findOrphanedPosters } from "@/lib/storage/posters";
import { formatDateTime } from "@/lib/time/format";

export const metadata: Metadata = { title: "Storage maintenance" };

export default async function StoragePage() {
  const { supabase } = await requireAdminPage("/admin/storage");
  const result = await findOrphanedPosters(supabase);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <p className="hud-label text-neon-cyan">Maintenance</p>
        <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">STORAGE</h1>
        <p className="mt-3 max-w-2xl text-mist">
          Poster files that no competition references — left behind by interrupted uploads or by a deletion whose file cleanup
          failed. Files uploaded within the last hour are protected because they may belong to a form that is still being
          submitted.
        </p>
      </div>
      {result.ok ? (
        <StorageCleanup
          orphans={result.data.map(
            (object): OrphanRow => ({
              path: object.path,
              size: object.size,
              createdLabel: formatDateTime(object.createdAt, SITE_TIME_ZONE),
              isRecent: object.isRecent,
            }),
          )}
        />
      ) : (
        <GalleryError message={result.error} />
      )}
    </div>
  );
}
