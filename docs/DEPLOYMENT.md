# Deploying PIXEL QUEST to Vercel

Prerequisites: the GitHub repository is pushed, and your Supabase project is set up with the
migrations applied and a first administrator provisioned (see [SUPABASE.md](SUPABASE.md)).

---

## 1. Import the repository

1. Sign in to [vercel.com](https://vercel.com) and click **Add New… → Project**.
2. Import `Marlon666-coder/PIXELWORLD` from GitHub.
3. Vercel auto-detects Next.js. Leave the build command (`next build`) and output settings at their
   defaults — do **not** force a static export; the app uses server rendering and Server Actions.

## 2. Configure environment variables

In **Project → Settings → Environment Variables**, add the following for the **Production**,
**Preview**, and **Development** environments:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | your publishable (or legacy anon) key |

Optional:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | your production URL, e.g. `https://pixel-quest.vercel.app` (pins Open Graph/canonical links) |
| `NEXT_PUBLIC_SITE_TIMEZONE` | IANA zone for displaying/entering dates, e.g. `Asia/Jakarta` (default `UTC`) |
| `NEXT_PUBLIC_POSTER_MAX_MB` | poster size limit in MB (default `5`; keep in sync with the bucket limit) |

Do **not** add the Supabase `service_role` / secret key — the app never uses it.

## 3. Configure Supabase auth URLs

So that sessions and any auth redirects work on your deployed domain, open the Supabase dashboard →
**Authentication → URL Configuration** and set:

- **Site URL**: your production URL (e.g. `https://pixel-quest.vercel.app`).
- **Redirect URLs**: add your production URL and the Vercel preview wildcard, e.g.
  `https://pixel-quest.vercel.app/**` and `https://*-<your-team>.vercel.app/**`.

## 4. Deploy

Click **Deploy**. Vercel installs dependencies, runs `next build`, and publishes. Every push to the
default branch triggers a production deploy; pull requests get preview deployments.

> The repo includes a CI workflow (`.github/workflows/ci.yml`) that runs lint, typecheck, unit tests,
> a production build, and a live-Supabase integration job on every push. Keep it green before merging.

## 5. Verify the live site

Work through this checklist against the deployed URL:

1. **Home** loads; the 3D world (or static fallback) renders and the headline reads
   **CHOOSE UR COMPETITION**.
2. **Explorer** shows the empty state ("NO QUESTS FOUND") on a fresh database, or the gallery if you
   have published competitions / seeded demo data.
3. **Admin login** (`/admin/login`) — sign in with your administrator account.
4. **Create & publish** a competition with a poster.
5. **Public gallery** — the newly published poster appears immediately, **without a redeploy**.
6. **Detail page** — open the competition; the full-size poster, dates and registration link work.
7. **Edit** the competition (including replacing the poster) and **delete** it; confirm the gallery
   updates.
8. **Authorization** — sign out; confirm `/admin` redirects to the login page and that drafts are not
   visible publicly.

## Promotion & environments

- **Preview** deployments (per PR) are ideal for reviewing changes against a staging Supabase
  project. Point preview env vars at staging if you want to keep production data clean.
- **Production** is promoted from the default branch. Keep production env vars pointing at your
  production Supabase project.

## Notes

- **No deploy needed to publish content.** Posters and competitions are stored in Supabase; the
  public gallery reads them live. Publishing in the admin dashboard makes them appear right away.
- **Custom domain**: add it in Vercel → Domains, then update the Supabase Site/Redirect URLs and
  (optionally) `NEXT_PUBLIC_SITE_URL` to match.
- The production domain is yours to choose; this guide does not assume a specific deployed URL.
