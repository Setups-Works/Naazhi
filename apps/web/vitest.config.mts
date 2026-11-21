import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Dates are built from local time (see src/lib/dates.ts); pin the zone so tests give the same answers on every machine and in CI.
process.env.TZ = "UTC";

// Database tests need a migrated PostgreSQL (docker compose up + pnpm db:migrate), so they run only on request: pnpm test:db.
const withDb = Boolean(process.env.RUN_DB_TESTS);
if (withDb && !process.env.DATABASE_URL) {
  try {
    process.loadEnvFile(".env.local"); // same variables the app uses; real environment variables (CI) win
  } catch {
    /* no .env.local: DATABASE_URL must come from the environment */
  }
}

export default {
  resolve: {
    alias: {
      // `server-only` throws outside a Next.js server build; tests import server modules directly.
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    testTimeout: 60000,
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts", ...(withDb ? ["tests/db/**/*.test.ts"] : [])],
  },
};
