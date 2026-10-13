# Supabase setup

This guide takes a fresh Supabase project to a fully working PIXEL QUEST backend:
schema, Row Level Security, the poster storage bucket, and your first administrator.

You can use either a **hosted** project (recommended for production) or a **local** stack
via the Supabase CLI. Both use the same migrations in `supabase/migrations/`.

---

## 1. Create the project

1. Sign in at [supabase.com](https://supabase.com) and create a new project. Choose a strong
   database password and a region close to your users.
2. When it finishes provisioning, open **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Publishable key** (`sb_publishable_…`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
     (if your project only shows a legacy **anon** key, use `NEXT_PUBLIC_SUPABASE_ANON_KEY` instead).

> The publishable/anon key is designed to be public. Your data is protected by Row Level Security,
> which the migrations below enable. **Never** expose the `service_role` / secret key in the browser.

## 2. Apply the migrations

The migrations create everything the app needs:

- `20261013000100_core_schema.sql` — `admin_users` and `competitions` tables, the `is_admin()`
  authorization function, the `updated_at` trigger, computed deadline-ordering functions, and all
  Row Level Security policies.
- `20261013000200_poster_storage.sql` — the public `competition-posters` bucket (5 MiB limit,
  JPEG/PNG/WebP only) with **admin-only** upload/delete policies.

### Option A — Supabase CLI (recommended)

```bash
# Install the CLI: https://supabase.com/docs/guides/cli
supabase link --project-ref <your-project-ref>
supabase db push          # applies everything in supabase/migrations/ in order
```

### Option B — SQL Editor

Open **SQL Editor** in the dashboard and run the contents of each file in
`supabase/migrations/`, **in filename order** (the `000100` schema file first, then `000200`).

### Verify

- **Table Editor** shows `admin_users` and `competitions`.
- **Storage** shows a `competition-posters` bucket marked **Public**.
- **Database → Policies** shows the RLS policies on `public.competitions` and `storage.objects`.

## 3. Create your first administrator

Authentication and authorization are separate: signing in proves identity; being listed in
`admin_users` grants admin access. Provisioning an admin is a trusted, two-step operation that an
API client can never perform on its own.

1. **Create the Auth user.** Dashboard → **Authentication → Users → Add user → Create new user**.
   Enter the email and a strong password and tick **Auto Confirm User** (so they can log in
   immediately without an email round-trip).
2. **Grant admin rights.** Open **SQL Editor** and run `supabase/scripts/provision-admin.sql`
   after replacing the placeholder email with the user's email:

   ```sql
   insert into public.admin_users (user_id, note)
   select id, 'Provisioned via SQL editor'
   from auth.users
   where email = lower('you@example.com')
   on conflict (user_id) do nothing
   returning user_id;
   ```

   Exactly one row should be returned. Zero rows means no Auth user has that email yet.

To **revoke** admin rights (the person keeps their login but loses all admin access):

```sql
delete from public.admin_users
where user_id = (select id from auth.users where email = lower('you@example.com'));
```

## 4. Harden sign-ups (production)

The app never exposes a public sign-up UI, and only `admin_users` members can manage data. For
defence in depth, also disable self-service registration in the dashboard:

**Authentication → Sign In / Providers → Email → "Allow new users to sign up" = off.**

> Do **not** disable this in `supabase/config.toml` for local development: the Supabase CLI turns
> the email provider off entirely when email signup is disabled, which also blocks admin **login**.
> The local config therefore keeps signup enabled; production hardening is done in the dashboard.

## 5. Point the app at the project

Put the values from step 1 into `.env.local` (local) and into your Vercel project's environment
variables (production — see [DEPLOYMENT.md](DEPLOYMENT.md)):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Restart `npm run dev`, open `/admin/login`, sign in, and create your first competition.

---

## Local stack (optional)

To run everything locally with Docker:

```bash
supabase start                     # starts Postgres, Auth, Storage, Studio and applies migrations
supabase status                    # shows local URL + keys
export $(supabase status -o env | sed 's/^/SUPABASE_/')   # for the seeder / integration tests
```

Create a local admin either through Studio (http://127.0.0.1:54323 → Authentication) + the
provisioning SQL, or programmatically with the service-role key. Seed sample data with
`npm run seed:demo` (remove it with `npm run seed:demo -- --clear`).

## Data model reference

**`competitions`**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid (pk) | `gen_random_uuid()` |
| `title` | text | 3–160 chars |
| `organizer` | text | 2–120 chars |
| `category` | text | one of the ten allowed values (CHECK constraint mirrors `lib/categories.ts`) |
| `description` | text | optional, ≤ 5000 chars |
| `poster_path` | text | `posters/<uuid>.<ext>`, unique; required when `status = 'published'` |
| `poster_width` / `poster_height` | int | optional, 1–12000 |
| `registration_url` | text | optional http(s) URL |
| `registration_deadline` | timestamptz | optional |
| `event_date` | timestamptz | optional |
| `status` | text | `draft` or `published` |
| `created_by` | uuid | set from the JWT by trigger; FK to `auth.users` |
| `created_at` / `updated_at` | timestamptz | `updated_at` maintained by trigger |

**`admin_users`** — `user_id` (pk, FK to `auth.users`), `note`, `created_at`. RLS-enabled with
no API policies, so only the service role / SQL editor can modify it.

### Adding a new category

1. Append the value in `lib/categories.ts` (and its label/accent).
2. Add a migration that recreates the `competitions_category_check` constraint including the new
   value.
3. Run `supabase gen types typescript --local > lib/supabase/database.types.ts` and `npm run typecheck`.
   CI's `scripts/compare-db-types.mjs` fails if the committed types drift from the schema.
