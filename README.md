<div align="center">

# PIXEL QUEST

### CHOOSE UR COMPETITION

**Discover your next challenge. Enter your next level.**

An immersive 3D pixel-world platform for discovering competitions. Visitors explore a
cinematic voxel universe and browse real competition posters like quests on a game board;
administrators upload, publish, edit and remove listings from a secure dashboard — no code
changes or redeploys required.

Next.js · React · TypeScript · Three.js / React Three Fiber · Tailwind CSS · Supabase

</div>

---

## Table of contents

- [What it is](#what-it-is)
- [Features](#features)
- [Technology stack](#technology-stack)
- [Repository structure](#repository-structure)
- [Quick start](#quick-start)
- [Configure Supabase](#configure-supabase)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Testing](#testing)
- [Deploy to Vercel](#deploy-to-vercel)
- [Security model](#security-model)
- [Troubleshooting](#troubleshooting)

---

## What it is

PIXEL QUEST turns a competition directory into an experience. The landing page renders a real,
interactive Three.js voxel world — a floating island, a glowing portal, satellite islands,
drifting cubes, distant planets and a star field — with cinematic lighting and selective bloom.
Scrolling travels from the universe down into the **quest board**, where published competitions
are shown as collectible mission cards pulled live from Supabase.

The world degrades gracefully: it drops quality on weaker devices, honours `prefers-reduced-motion`,
and falls back to a hand-built static pixel scene when WebGL is unavailable — the gallery and admin
tools never depend on the 3D scene.

## Features

**Public**
- Cinematic 3D hero with pointer parallax, scroll-driven camera, and a reactive portal
- Quest explorer: live search (title/organizer), category filters, registration-status filters,
  four sort modes, and pagination — all driven by shareable URL query params
- Registration status (`Open` / `Closing soon` / `Closed` / `No deadline`) computed live from
  timestamps, never stored stale
- Per-competition pages with a zoomable full-size poster, full brief, dates, a safe registration
  link, and share button
- Polished empty, loading (skeleton), error (with retry) and setup states
- Responsive from mobile to desktop; keyboard accessible with visible focus states

**Admin**
- Supabase Auth email/password login with a password-visibility toggle and clear errors
- Dashboard with real statistics (total / published / drafts / upcoming deadlines, next deadlines,
  recently added)
- Create / edit / delete competitions with draft & published states and a confirmation dialog
- Drag-and-drop poster upload with image preview, real upload progress, and content-based file
  validation (magic bytes, not just the extension)
- Direct-to-storage uploads via one-time signed URLs; the old poster is replaced only after the new
  upload **and** database write succeed
- Storage maintenance screen to find and clean up orphaned poster files

## Technology stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Components, Server Actions, Turbopack) |
| Language | TypeScript (strict) |
| UI | React 19, Tailwind CSS v4 |
| 3D | Three.js, React Three Fiber, Drei, postprocessing + react-postprocessing |
| Backend | Supabase — Postgres, Auth, Storage (via `@supabase/ssr` + `@supabase/supabase-js`) |
| Validation | Zod 4, React Hook Form |
| Icons | lucide-react |
| Testing | Vitest (unit + live-Supabase integration) |
| Hosting | Vercel |

## Repository structure

```
app/
  (site)/                 Public routes: home, /competitions/[id], /about
  admin/                  /admin/login and the protected (dashboard) group
  layout.tsx, error, not-found, robots, icon, fonts/
components/
  world/                  Three.js scene (canvas, portal, islands, backdrop, effects, fallback)
  hero/ competitions/ admin/ layout/ brand/
lib/
  actions/                Server Actions (auth + competition CRUD + storage cleanup)
  auth/                   Admin authorization helpers
  supabase/               Browser, server, public and proxy clients + generated DB types
  competitions/           Queries, view model, deadline logic, explorer params
  images/ storage/        Content-based image validation + poster storage helpers
  security/ time/ world/  URL safety, timezone/formatting, procedural world + quality tiers
  validation/             Zod schemas shared by client and server
supabase/
  migrations/             SQL schema, RLS policies, storage bucket + policies
  config.toml             Local/CI stack configuration
  scripts/provision-admin.sql
scripts/                  Demo seeder + DB-types drift guard
tests/
  unit/                   84 fast tests (logic, validation, security, parsing)
  integration/            Live-Supabase RLS / authorization / storage tests
docs/                     SUPABASE.md, DEPLOYMENT.md, TESTING.md
proxy.ts                  Session refresh + admin route guard (Next.js proxy/middleware)
```

## Quick start

Requirements: **Node.js 20+** and a Supabase project (hosted, or local via the Supabase CLI + Docker).

```bash
git clone https://github.com/Marlon666-coder/PIXELWORLD.git
cd PIXELWORLD
npm install
cp .env.example .env.local      # then fill in your Supabase URL + publishable key
npm run dev                     # http://localhost:3000
```

Without configuration the app renders a clear "Connect Supabase" setup notice instead of crashing.
To create the database schema and your first administrator, follow **[Configure Supabase](#configure-supabase)**.

## Configure Supabase

Full step-by-step instructions — including creating the Storage bucket, applying migrations, and
provisioning the first admin — are in **[docs/SUPABASE.md](docs/SUPABASE.md)**. In short:

1. Create a project at [supabase.com](https://supabase.com) and copy the **Project URL** and
   **publishable key** (Project Settings → API).
2. Apply the SQL migrations in `supabase/migrations/` (via `supabase db push`, or by pasting them
   into the SQL Editor in order). This creates the tables, the `is_admin()` function, triggers,
   Row Level Security policies, and the public `competition-posters` storage bucket with
   admin-only write policies.
3. Create one Auth user (Authentication → Users → Add user → **Auto Confirm**), then grant it admin
   rights by running `supabase/scripts/provision-admin.sql` with that user's email.
4. Put the URL and publishable key in `.env.local`.

## Environment variables

See [`.env.example`](.env.example) for the full, commented list. The app needs only two public
values; it never uses the service-role/secret key.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ | Publishable (or legacy anon) key — public by design; RLS protects data |
| `NEXT_PUBLIC_SITE_URL` | — | Canonical absolute site URL for metadata (auto-detected on Vercel) |
| `NEXT_PUBLIC_SITE_TIMEZONE` | — | IANA zone for displaying/entering dates (default `UTC`) |
| `NEXT_PUBLIC_POSTER_MAX_MB` | — | Upload size limit in MB (default `5`) |

`SUPABASE_URL` + `SUPABASE_SECRET_KEY` are needed **only** by the optional demo seeder and the
integration tests — never expose the secret key in the browser or commit it.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (Next core-web-vitals + TypeScript) |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm run test` / `test:unit` | Run the unit suite (84 tests) |
| `npm run test:integration` | Run live-Supabase integration tests (needs a local/staging stack) |
| `npm run seed:demo` | Insert clearly-labelled demo competitions (dev only; `-- --clear` to remove) |

## Testing

- **Unit tests (84)** cover deadline logic, timezone conversion, URL/redirect safety, content-based
  image validation, Zod schemas, explorer-param parsing, poster-path handling, env parsing, quality
  selection and procedural generation. Run with `npm run test:unit`.
- **Integration tests (16)** run against a **real** local Supabase stack and verify Row Level
  Security, the admin-authorization model, `created_by` spoof protection, DB constraints/triggers,
  and all Storage policies. They run automatically in CI (`.github/workflows/ci.yml`).

See **[docs/TESTING.md](docs/TESTING.md)** for how to run the integration suite locally and the
full checklist of what is verified. CI runs lint, typecheck, the unit suite, a production build,
and the Supabase integration job on every push.

## Deploy to Vercel

Complete instructions are in **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**. Summary: import the repo
into Vercel, set the two `NEXT_PUBLIC_SUPABASE_*` environment variables, add your Vercel domain to
Supabase's redirect/site URLs, and deploy. Published posters appear in the public gallery
immediately — no redeploy needed.

## Security model

- **Authentication** via Supabase Auth; **authorization** via an `admin_users` table checked by a
  `SECURITY DEFINER` `is_admin()` function. Identity always comes from the verified JWT, never from
  client state or editable metadata.
- **Row Level Security** on all tables: anonymous users read only published competitions; only
  administrators read drafts or write anything; nobody can grant themselves admin.
- **Storage**: a public-read bucket (fast, cacheable posters) with **admin-only** insert/delete
  policies and bucket-level MIME + size limits; the server additionally verifies real file bytes.
- **Server-side everything**: every admin page, Server Action, and the proxy re-verify the session
  and role; the public gallery uses a cookie-less anon client so a signed-in admin can never leak
  drafts to a public page.
- Registration links are validated (http/https only, no credentials/IPs) and open with
  `rel="noopener noreferrer"`; post-login redirects are restricted to same-origin admin paths.
- The service-role key is never shipped to the browser or used by the app.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| "Connect Supabase" setup notice | `NEXT_PUBLIC_SUPABASE_URL` / `…PUBLISHABLE_KEY` are missing or invalid. Set them and restart. |
| "SIGNAL INTERRUPTED" in the gallery | The database request failed (wrong URL/key, project paused, or migrations not applied). Check the values and that migrations ran. |
| Login says "not authorized" | The account authenticated but isn't in `admin_users`. Run `supabase/scripts/provision-admin.sql`. |
| Login says "Email logins are disabled" (local) | Keep `[auth.email] enable_signup = true` in `supabase/config.toml`; the CLI disables email auth otherwise. |
| Posters don't display | Confirm the `competition-posters` bucket exists and is public, and that your Supabase hostname is allowed in `next.config.ts` image `remotePatterns` (handled automatically from the env URL). |
| Upload rejected | File isn't a real JPEG/PNG/WebP, is over the size limit, or you aren't signed in as an admin. |
| 3D scene doesn't appear | WebGL may be unavailable — the static fallback is expected. Force a mode for testing with `?world=static\|low\|medium\|high`. |

---

Built as a complete, maintainable application — not a prototype. Contributions and listings are
curated by the site administrators.
