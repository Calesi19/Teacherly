import { defineConfig } from "drizzle-kit";

import { loadEnv, requireDatabaseUrl } from "./src/env";

loadEnv();

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: requireDatabaseUrl() },
  strict: true,
  verbose: true,
});
