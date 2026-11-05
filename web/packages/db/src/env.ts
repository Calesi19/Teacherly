import { fileURLToPath } from "node:url";

import dotenv from "dotenv";

/** `web/.env` — one env file for the whole workspace. */
const ENV_PATH = fileURLToPath(new URL("../../../.env", import.meta.url));

export function loadEnv(): void {
  dotenv.config({ path: ENV_PATH, quiet: true });
}

export function requireDatabaseUrl(): string {
  const url = process.env["DATABASE_URL"];
  if (url === undefined || url.length === 0) {
    throw new Error(
      "DATABASE_URL is not set. Copy web/.env.example to web/.env (`pnpm dev` does this for you).",
    );
  }
  return url;
}
