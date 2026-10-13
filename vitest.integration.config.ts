import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Integration tests run against a REAL local Supabase stack (started by the
 * Supabase CLI). They are intentionally separate from the fast unit suite and
 * require SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY in the
 * environment (see .github/workflows/ci.yml and docs/TESTING.md).
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    globals: false,
    hookTimeout: 60_000,
    testTimeout: 30_000,
    fileParallelism: false,
    retry: 0,
  },
});
