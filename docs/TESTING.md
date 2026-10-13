# Testing

PIXEL QUEST has two test suites plus a CI pipeline.

| Suite | Command | Needs Supabase? | What it covers |
| --- | --- | --- | --- |
| Unit | `npm run test:unit` | No | Pure logic, validation, security helpers, parsing |
| Integration | `npm run test:integration` | Yes (local stack) | Real RLS, authorization, DB constraints, Storage policies |

---

## Unit tests (84)

Fast, dependency-free tests in `tests/unit/`:

- **Deadline logic** — status thresholds and the DB-filter/label equivalence used for filtering.
- **Timezone** — wall-clock ↔ UTC conversion, DST edge cases, round-tripping, offset formatting.
- **URL safety** — external-link validation (scheme/credentials/IP rejection) and same-origin
  admin redirect guards.
- **Image inspection** — magic-byte format detection and dimension parsing for JPEG (incl. EXIF
  orientation), PNG, and WebP (VP8/VP8L); size and decompression-bomb guards.
- **Validation** — the Zod schemas and form→DB conversion shared by client and server.
- **Explorer params** — search sanitisation, URL query build/parse round-trips, pagination maths.
- **Poster storage, env, world quality, procedural generation** — path handling, env parsing,
  device-tier selection, deterministic world generation.

```bash
npm run test:unit        # or: npm run test
```

## Integration tests (16)

`tests/integration/rls.test.ts` runs against a **real** Supabase stack and is the authoritative
check that security is actually enforced in the database — not just in application code. It verifies:

- `is_admin()` returns true only for provisioned admins.
- Anonymous visitors see **published** competitions only; admins can read drafts.
- Anonymous and non-admin authenticated users **cannot** insert, update, or delete competitions;
  admins can.
- `created_by` is set from the JWT and a spoofed value is ignored.
- `admin_users` is unreadable/unwritable by non-admins (no privilege escalation).
- DB constraints reject unknown categories and publishing without a poster; the `updated_at`
  trigger fires on update.
- Storage: anon/non-admin uploads and deletes are rejected; admins can upload (object is publicly
  readable) and delete; the bucket rejects disallowed MIME types.

The suite **skips** automatically (it does not fail) when no Supabase credentials are present, so
`npm run test` stays green on machines without a local stack.

### Run it locally

```bash
# 1. Start a local Supabase stack (requires Docker + the Supabase CLI).
supabase start

# 2. Export the local URL + keys the tests expect.
export $(supabase status -o env | sed 's/^/SUPABASE_/')
#    This provides SUPABASE_API_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, …
#    The helper also accepts SUPABASE_URL; if needed:
export SUPABASE_URL="$SUPABASE_API_URL"

# 3. Run the suite.
npm run test:integration

# 4. Tear down when done.
supabase stop
```

The tests create their own throwaway Auth users and clean up competitions and poster objects in
`afterAll`. Run them against a local or disposable staging project — **never** against production.

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request, in two jobs:

1. **Lint · Typecheck · Unit · Build** — `npm ci`, ESLint, `next typegen` + `tsc`, the unit suite,
   and a production `next build` with placeholder config (proving the app builds without a live
   project).
2. **Supabase integration (local stack)** — installs the Supabase CLI, runs `supabase start`
   (applying the migrations to real Postgres), regenerates the typed schema and fails if the
   committed `lib/supabase/database.types.ts` has drifted
   (`scripts/compare-db-types.mjs`), runs the integration suite against the live stack, and
   smoke-tests the demo seeder (seed then clear).

Both jobs must pass before merging.

## Manual QA aids

- Force a world render mode with a query param: `?world=static`, `?world=low`, `?world=medium`,
  `?world=high` — useful for checking the fallback and each quality tier on any device.
- `prefers-reduced-motion` is honoured: the scene renders a static first frame and skips animation.

## What is not automated

- Full visual regression of the 3D scene (verified manually via screenshots across viewports).
- Real end-to-end browser flows against a hosted project (the integration suite exercises the same
  Supabase operations the UI performs — auth, RLS reads/writes, signed-URL-equivalent uploads,
  deletes — at the API layer).
