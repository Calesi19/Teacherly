import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { ensurePostgres, WEB_ROOT } from "./postgres.mjs";

/**
 * `pnpm dev` — one command from a clean checkout to a running app:
 *   .env → Postgres 16 → migrations → API → client.
 *
 * `--api-only` stops before the client. Playwright uses it so it can wait on
 * the API's health endpoint before starting the client itself.
 */
const apiOnly = process.argv.includes("--api-only");

/* 1. .env ----------------------------------------------------------------- */

const envPath = join(WEB_ROOT, ".env");
if (!existsSync(envPath)) {
  copyFileSync(join(WEB_ROOT, ".env.example"), envPath);
  console.log("[dev] created web/.env from .env.example");
}

/* 2. database ------------------------------------------------------------- */

await ensurePostgres();

/* 3. migrations ----------------------------------------------------------- */

const migrate = spawnSync("pnpm", ["--filter", "@teacherly/db", "migrate"], {
  cwd: WEB_ROOT,
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (migrate.status !== 0) {
  console.error("[dev] migrations failed");
  process.exit(migrate.status ?? 1);
}

/* 4. processes ------------------------------------------------------------ */

const children = [];

function start(name, args) {
  const child = spawn("pnpm", args, {
    cwd: WEB_ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  children.push(child);
  child.on("exit", (code, signal) => {
    // If either half dies, take the whole dev environment down rather than
    // leaving a half-running stack that looks healthy.
    if (shuttingDown) return;
    console.error(`[dev] ${name} exited (code=${code ?? "null"} signal=${signal ?? "none"})`);
    shutdown(code ?? 1);
  });
  return child;
}

let shuttingDown = false;

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill("SIGTERM");
  }
  // The embedded Postgres is deliberately left running: it is a daemon, and
  // restarting it on every `pnpm dev` would be slow. `pnpm db:down` stops it.
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

start("api", ["--filter", "@teacherly/server", "dev"]);
if (!apiOnly) {
  start("client", ["--filter", "@teacherly/web", "dev"]);
  console.log("[dev] API on http://localhost:3000 — client on http://localhost:5173");
} else {
  console.log("[dev] API only, on http://localhost:3000");
}
