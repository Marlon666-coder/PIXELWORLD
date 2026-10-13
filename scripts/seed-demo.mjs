#!/usr/bin/env node
/**
 * OPTIONAL demo seeder — clearly-labelled sample data for local development only.
 *
 *   node scripts/seed-demo.mjs                 # insert demo competitions (+ generated posters)
 *   node scripts/seed-demo.mjs --clear         # remove previously seeded demo data
 *
 * Requires SUPABASE_URL and SUPABASE_SECRET_KEY (service role) in the environment,
 * e.g. `export $(supabase status -o env | sed 's/^/SUPABASE_/')` for a local stack,
 * or set them to a throwaway/staging project. NEVER run this against production.
 *
 * Every seeded row has organizer "PIXEL QUEST Demo" and a poster under posters/demo-*,
 * so `--clear` can remove exactly what it created and nothing else.
 */
import zlib from "node:zlib";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SERVICE_ROLE_KEY;
const BUCKET = "competition-posters";
// Demo rows are identified by this organizer name (used by --clear), so poster
// paths can keep the exact app format that the DB constraint requires.
const DEMO_ORGANIZER = "PIXEL QUEST Demo";

if (!url || !secret) {
  console.error("Missing SUPABASE_URL and/or SUPABASE_SECRET_KEY. See the comment at the top of this file.");
  process.exit(1);
}

const supabase = createClient(url, secret, { auth: { persistSession: false } });

const daysFromNow = (days) => new Date(Date.now() + days * 86_400_000).toISOString();

const DEMO = [
  { title: "Neon Code Rush", category: "programming", days: 12, event: 20, color: "#2de2f5", desc: "A timed algorithmic sprint across three increasingly fiendish problem sets.\n\nSolo or in pairs. Bring your sharpest ideas." },
  { title: "Voxel Builders Hackathon", category: "hackathon", days: 3, event: 10, color: "#9b6bff", desc: "48 hours to ship something playable in a shared pixel universe." },
  { title: "Interface Horizons", category: "ui-ux-design", days: 25, event: 40, color: "#f062e6", desc: "Reimagine an everyday app for a world that runs on holographic displays." },
  { title: "Startup Signal", category: "business", days: -4, event: 2, color: "#4cf08a", desc: "Pitch a venture to a panel of founders. Registration has closed for this cycle." },
  { title: "Data Nebula Challenge", category: "data-science", days: 40, event: 55, color: "#2de2f5", desc: "Model a synthetic cosmic dataset and chart the most insightful story." },
  { title: "Machine Dreams AI Cup", category: "artificial-intelligence", days: 6, event: 30, color: "#9b6bff", desc: "Build an agent that navigates a procedurally generated maze." },
  { title: "Quantum Quill", category: "scientific-writing", days: 18, color: "#4cf08a", desc: "A short-form science writing contest. Make the complex feel inevitable." },
  { title: "Lightfield Photo Expedition", category: "photography", days: 30, event: 45, color: "#f062e6", desc: "Capture 'motion at rest'. Any camera, any city." },
];

/** Builds a tiny but valid solid-colour PNG so the gallery has real images to show. */
async function solidPng(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const width = 48;
  const height = 60;
  const crc32 = (buf) => {
    let c = ~0;
    for (let i = 0; i < buf.length; i += 1) {
      c ^= buf[i];
      for (let k = 0; k < 8; k += 1) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    }
    return (~c) >>> 0;
  };
  const chunk = (type, data) => {
    const typeBytes = Buffer.from(type, "ascii");
    const body = Buffer.concat([typeBytes, data]);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: width }, () => [r, g, b]).flat())]);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function clear() {
  const { data: rows } = await supabase.from("competitions").select("id,poster_path").eq("organizer", DEMO_ORGANIZER);
  if (rows?.length) {
    await supabase.from("competitions").delete().eq("organizer", DEMO_ORGANIZER);
    const paths = rows.map((r) => r.poster_path).filter(Boolean);
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  }
  console.log(`Cleared ${rows?.length ?? 0} demo competition(s).`);
}

async function seed() {
  await clear();
  let inserted = 0;
  for (const item of DEMO) {
    const path = `posters/${crypto.randomUUID()}.png`;
    const png = await solidPng(item.color);
    const upload = await supabase.storage.from(BUCKET).upload(path, png, { contentType: "image/png", upsert: false });
    if (upload.error) {
      console.error(`  poster upload failed for "${item.title}": ${upload.error.message}`);
      continue;
    }
    const { error } = await supabase.from("competitions").insert({
      title: item.title,
      organizer: DEMO_ORGANIZER,
      category: item.category,
      description: item.desc,
      status: "published",
      poster_path: path,
      poster_width: 48,
      poster_height: 60,
      registration_deadline: daysFromNow(item.days),
      event_date: item.event ? daysFromNow(item.event) : null,
      registration_url: "https://example.com/register",
    });
    if (error) {
      await supabase.storage.from(BUCKET).remove([path]);
      console.error(`  insert failed for "${item.title}": ${error.message}`);
      continue;
    }
    inserted += 1;
    console.log(`  + ${item.title}`);
  }
  console.log(`\nSeeded ${inserted} demo competition(s). This is sample data — remove it with: node scripts/seed-demo.mjs --clear`);
}

const run = process.argv.includes("--clear") ? clear : seed;
run().catch((error) => {
  console.error(error);
  process.exit(1);
});
