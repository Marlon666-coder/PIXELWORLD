import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createAdminClient,
  createAnonClient,
  createUser,
  deleteUser,
  readIntegrationEnv,
  tinyPng,
  uniqueTitle,
  type IntegrationEnv,
  type TestUser,
} from "./helpers";

const env = readIntegrationEnv();
const BUCKET = "competition-posters";

// Skip gracefully (not fail) when no local Supabase is configured.
const describeMaybe = env ? describe : describe.skip;

describeMaybe("Supabase RLS, authorization & storage", () => {
  const config = env as IntegrationEnv;
  let admin: TestUser;
  let outsider: TestUser;
  const createdCompetitionIds: string[] = [];
  const createdPosterPaths: string[] = [];

  beforeAll(async () => {
    admin = await createUser(config, true);
    outsider = await createUser(config, false);
  });

  afterAll(async () => {
    const service = createAdminClient(config);
    if (createdCompetitionIds.length) await service.from("competitions").delete().in("id", createdCompetitionIds);
    if (createdPosterPaths.length) await service.storage.from(BUCKET).remove(createdPosterPaths);
    if (admin) await deleteUser(config, admin.id);
    if (outsider) await deleteUser(config, outsider.id);
  });

  async function seedCompetition(status: "draft" | "published", posterPath: string | null) {
    const service = createAdminClient(config);
    const title = uniqueTitle();
    const { data, error } = await service
      .from("competitions")
      .insert({ title, organizer: "Test Org", category: "programming", status, poster_path: posterPath, created_by: admin.id })
      .select("id")
      .single();
    if (error || !data) throw new Error(`seed failed: ${error?.message}`);
    createdCompetitionIds.push(data.id);
    return { id: data.id, title };
  }

  describe("is_admin()", () => {
    it("returns true for admins and false for other authenticated users", async () => {
      const asAdmin = await admin.client.rpc("is_admin");
      expect(asAdmin.data).toBe(true);
      const asOutsider = await outsider.client.rpc("is_admin");
      expect(asOutsider.data).toBe(false);
    });
  });

  describe("competitions SELECT", () => {
    it("anonymous visitors see published rows but not drafts", async () => {
      const draft = await seedCompetition("draft", null);
      const published = await seedCompetition("published", null);
      const anon = createAnonClient(config);

      const { data } = await anon.from("competitions").select("id,status");
      const ids = new Set((data ?? []).map((row) => row.id));
      expect(ids.has(published.id)).toBe(true);
      expect(ids.has(draft.id)).toBe(false);
      expect((data ?? []).every((row) => row.status === "published")).toBe(true);
    });

    it("admins can read drafts", async () => {
      const draft = await seedCompetition("draft", null);
      const { data } = await admin.client.from("competitions").select("id").eq("id", draft.id).maybeSingle();
      expect(data?.id).toBe(draft.id);
    });
  });

  describe("competitions write access", () => {
    it("anonymous users cannot insert", async () => {
      const anon = createAnonClient(config);
      const { error } = await anon
        .from("competitions")
        .insert({ title: uniqueTitle(), organizer: "x", category: "other", status: "draft" });
      expect(error).not.toBeNull();
    });

    it("non-admin authenticated users cannot insert, update, or delete", async () => {
      const insert = await outsider.client
        .from("competitions")
        .insert({ title: uniqueTitle(), organizer: "x", category: "other", status: "draft" });
      expect(insert.error).not.toBeNull();

      const target = await seedCompetition("published", null);
      const update = await outsider.client.from("competitions").update({ title: "hacked" }).eq("id", target.id).select("id");
      expect(update.data ?? []).toHaveLength(0); // RLS hides the row; no rows updated

      const del = await outsider.client.from("competitions").delete().eq("id", target.id).select("id");
      expect(del.data ?? []).toHaveLength(0);

      // Confirm the row is unchanged.
      const service = createAdminClient(config);
      const { data } = await service.from("competitions").select("title").eq("id", target.id).single();
      expect(data?.title).not.toBe("hacked");
    });

    it("admins can insert, update and delete", async () => {
      const insert = await admin.client
        .from("competitions")
        .insert({ title: uniqueTitle(), organizer: "Org", category: "hackathon", status: "draft" })
        .select("id")
        .single();
      expect(insert.error).toBeNull();
      const id = insert.data!.id;
      createdCompetitionIds.push(id);

      const update = await admin.client.from("competitions").update({ organizer: "Updated Org" }).eq("id", id).select("organizer").single();
      expect(update.data?.organizer).toBe("Updated Org");

      const del = await admin.client.from("competitions").delete().eq("id", id).select("id").single();
      expect(del.data?.id).toBe(id);
    });

    it("sets created_by from the JWT, ignoring a spoofed value", async () => {
      const insert = await admin.client
        .from("competitions")
        .insert({ title: uniqueTitle(), organizer: "Org", category: "other", status: "draft", created_by: outsider.id })
        .select("id,created_by")
        .single();
      expect(insert.error).toBeNull();
      createdCompetitionIds.push(insert.data!.id);
      expect(insert.data?.created_by).toBe(admin.id); // trigger overrode the spoofed id
    });
  });

  describe("admin_users is locked down", () => {
    it("non-admins cannot read or grant themselves admin", async () => {
      const read = await outsider.client.from("admin_users").select("user_id");
      expect(read.data ?? []).toHaveLength(0);
      const grant = await outsider.client.from("admin_users").insert({ user_id: outsider.id });
      expect(grant.error).not.toBeNull();
    });
  });

  describe("database constraints", () => {
    it("rejects an unknown category", async () => {
      const service = createAdminClient(config);
      const { error } = await service
        .from("competitions")
        .insert({ title: uniqueTitle(), organizer: "x", category: "cooking", status: "draft" });
      expect(error).not.toBeNull();
    });

    it("rejects publishing without a poster", async () => {
      const service = createAdminClient(config);
      const { error } = await service
        .from("competitions")
        .insert({ title: uniqueTitle(), organizer: "x", category: "other", status: "published", poster_path: null });
      expect(error).not.toBeNull();
    });

    it("maintains updated_at via trigger", async () => {
      const created = await seedCompetition("draft", null);
      const service = createAdminClient(config);
      const before = await service.from("competitions").select("updated_at").eq("id", created.id).single();
      await new Promise((resolve) => setTimeout(resolve, 1100));
      await service.from("competitions").update({ organizer: "Touched" }).eq("id", created.id);
      const after = await service.from("competitions").select("updated_at").eq("id", created.id).single();
      expect(new Date(after.data!.updated_at).getTime()).toBeGreaterThan(new Date(before.data!.updated_at).getTime());
    });
  });

  describe("storage policies", () => {
    it("anonymous and non-admin users cannot upload", async () => {
      const path = `posters/${crypto.randomUUID()}.png`;
      const anon = createAnonClient(config);
      const anonUpload = await anon.storage.from(BUCKET).upload(path, tinyPng(), { contentType: "image/png" });
      expect(anonUpload.error).not.toBeNull();

      const outsiderUpload = await outsider.client.storage.from(BUCKET).upload(path, tinyPng(), { contentType: "image/png" });
      expect(outsiderUpload.error).not.toBeNull();
    });

    it("admins can upload and the object is publicly readable", async () => {
      const path = `posters/${crypto.randomUUID()}.png`;
      const upload = await admin.client.storage.from(BUCKET).upload(path, tinyPng(), { contentType: "image/png" });
      expect(upload.error).toBeNull();
      createdPosterPaths.push(path);

      // Public bucket: the object is downloadable without auth.
      const publicUrl = `${config.url.replace(/\/+$/, "")}/storage/v1/object/public/${BUCKET}/${path}`;
      const response = await fetch(publicUrl);
      expect(response.status).toBe(200);
    });

    it("the bucket rejects a disallowed MIME type", async () => {
      const path = `posters/${crypto.randomUUID()}.png`;
      const upload = await admin.client.storage
        .from(BUCKET)
        .upload(path, new Uint8Array([1, 2, 3, 4]), { contentType: "application/pdf" });
      expect(upload.error).not.toBeNull();
    });

    it("non-admins cannot delete an admin's object", async () => {
      const path = `posters/${crypto.randomUUID()}.png`;
      await admin.client.storage.from(BUCKET).upload(path, tinyPng(), { contentType: "image/png" });
      createdPosterPaths.push(path);

      const outsiderDelete = await outsider.client.storage.from(BUCKET).remove([path]);
      expect(outsiderDelete.data ?? []).toHaveLength(0); // nothing deleted

      // Still downloadable → it was not removed.
      const publicUrl = `${config.url.replace(/\/+$/, "")}/storage/v1/object/public/${BUCKET}/${path}`;
      expect((await fetch(publicUrl)).status).toBe(200);
    });

    it("admins can delete their object", async () => {
      const path = `posters/${crypto.randomUUID()}.png`;
      await admin.client.storage.from(BUCKET).upload(path, tinyPng(), { contentType: "image/png" });
      const del = await admin.client.storage.from(BUCKET).remove([path]);
      expect(del.error).toBeNull();
      expect(del.data ?? []).not.toHaveLength(0);
    });
  });
});
