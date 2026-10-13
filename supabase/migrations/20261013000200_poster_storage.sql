-- PIXEL QUEST — poster storage
--
-- Access model: PUBLIC bucket.
--   * Reads: anyone holding an object URL can download it (public buckets bypass RLS
--     for downloads). Paths are random UUIDs, so posters of unpublished drafts are
--     not discoverable, and anonymous clients cannot LIST the bucket (no select policy).
--   * Writes: only administrators may upload or delete. Nobody may overwrite or move an
--     object (no UPDATE policy), so a poster can never be replaced in place.
--   * The bucket itself rejects files over 5 MiB and non-image MIME types; the
--     application additionally verifies the real file signature on the server.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'competition-posters',
  'competition-posters',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Administrators can list competition posters"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'competition-posters' and (select public.is_admin()));

create policy "Administrators can upload competition posters"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'competition-posters'
    and (select public.is_admin())
    and (storage.foldername(name))[1] = 'posters'
    and lower(storage.extension(name)) in ('jpg', 'png', 'webp')
  );

create policy "Administrators can delete competition posters"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'competition-posters' and (select public.is_admin()));
