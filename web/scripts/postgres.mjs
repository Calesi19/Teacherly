import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createConnection } from "node:net";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const WEB_ROOT = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));

/** Must stay in step with docker-compose.yml and .env.example. */
export const DB = {
  host: "127.0.0.1",
  port: 5432,
  user: "teacherly",
  password: "teacherly",
  database: "teacherly",
};

export const DATABASE_URL = `postgres://${DB.user}:${DB.password}@${DB.host}:${DB.port}/${DB.database}`;

function run(command, args, options = {}) {
  return spawnSync(command, args, { encoding: "utf8", ...options });
}

export function dockerAvailable() {
  const probe = run("docker", ["compose", "version"]);
  return probe.status === 0;
}

export function portOpen({ host, port }) {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    const settle = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(1_000);
    socket.once("connect", () => settle(true));
    socket.once("error", () => settle(false));
    socket.once("timeout", () => settle(false));
  });
}

export async function waitForPort({ host, port, timeoutMs = 60_000 }) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (await portOpen({ host, port })) return;
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for ${host}:${port} after ${timeoutMs}ms.`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

/* ------------------------------------------------------------------ docker */

function startWithDocker() {
  const up = run("docker", ["compose", "up", "-d", "postgres"], {
    cwd: WEB_ROOT,
    stdio: "inherit",
  });
  if (up.status !== 0) throw new Error("`docker compose up -d postgres` failed.");
  return "docker";
}

/* ---------------------------------------------------------------- embedded */

/**
 * Fallback for machines without Docker — notably CI runners and sandboxes.
 * `embedded-postgres` ships real PostgreSQL 16 binaries per platform; we drive
 * `initdb` and `pg_ctl` directly rather than through its Node API, because
 * `pg_ctl start` daemonises properly and so survives this script exiting.
 */
function embeddedBinDir() {
  const platformPackage = `@embedded-postgres/${process.platform}-${process.arch}`;
  const fail = (reason) => {
    throw new Error(
      `No Postgres available: Docker is not installed and ${platformPackage} ${reason}. ` +
        `Install Docker (see web/README.md) or run \`pnpm install\` to fetch the embedded build.`,
    );
  };

  // The platform package is an optional dependency of `embedded-postgres`, not
  // a direct one of this workspace, so it is not resolvable from here under
  // pnpm's strict layout. Resolve the meta-package's entry point and walk up to
  // the node_modules that holds its own dependencies.
  const require = createRequire(import.meta.url);
  let dir;
  try {
    dir = dirname(require.resolve("embedded-postgres", { paths: [WEB_ROOT] }));
  } catch {
    fail("is not installed");
  }

  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = join(dir, "node_modules", platformPackage, "native", "bin");
    if (existsSync(join(candidate, "postgres"))) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return fail("has no PostgreSQL binaries for this platform");
}

const DATA_DIR = join(WEB_ROOT, ".pgdata");

/**
 * The unix socket cannot live in `.pgdata`: a socket path is capped at 107
 * bytes and a checkout nested a few directories deep blows past that. Keep it
 * in the OS temp dir under a short name derived from the data directory, so two
 * checkouts on one machine still get separate sockets.
 */
const SOCKET_DIR = join(
  tmpdir(),
  `teacherly-pg-${createHash("sha256").update(DATA_DIR).digest("hex").slice(0, 10)}`,
);

function startEmbedded() {
  const bin = embeddedBinDir();
  const pgCtl = join(bin, "pg_ctl");

  if (!existsSync(join(DATA_DIR, "PG_VERSION"))) {
    mkdirSync(DATA_DIR, { recursive: true });
    // initdb only accepts the superuser password from a file. Keep it in the
    // OS temp dir and delete it as soon as initdb has read it.
    const passwordFile = join(mkdtempSync(join(tmpdir(), "teacherly-pg-")), "pw");
    writeFileSync(passwordFile, DB.password, { mode: 0o600 });

    const init = run(join(bin, "initdb"), [
      "-D",
      DATA_DIR,
      `--username=${DB.user}`,
      `--pwfile=${passwordFile}`,
      // Password-authenticate every path, including the unix socket. Nothing
      // here needs socket access, so there is no reason to trust it.
      "--auth=scram-sha-256",
      "--encoding=UTF8",
    ]);
    rmSync(dirname(passwordFile), { recursive: true, force: true });
    if (init.status !== 0) {
      throw new Error(`initdb failed:\n${init.stderr ?? ""}${init.stdout ?? ""}`);
    }
  }

  mkdirSync(SOCKET_DIR, { recursive: true });

  const status = run(pgCtl, ["-D", DATA_DIR, "status"]);
  if (status.status !== 0) {
    const start = run(pgCtl, [
      "-D",
      DATA_DIR,
      "-l",
      join(DATA_DIR, "server.log"),
      "-o",
      `-p ${DB.port} -k ${SOCKET_DIR}`,
      "-w",
      "start",
    ]);
    if (start.status !== 0) {
      throw new Error(`pg_ctl start failed:\n${start.stderr ?? ""}${start.stdout ?? ""}`);
    }
  }

  return "embedded";
}

/**
 * initdb creates `postgres`, `template0` and `template1` — not our application
 * database. The embedded build ships only `initdb`, `pg_ctl` and `postgres`
 * (no `createdb`, no `psql`), so this connects with the `pg` driver the project
 * already depends on. The docker-compose path gets its database from
 * POSTGRES_DB, which is why this runs only for the embedded backend.
 */
async function ensureDatabaseExists() {
  const { Client } = await import("pg");
  const client = new Client({
    host: DB.host,
    port: DB.port,
    user: DB.user,
    password: DB.password,
    database: "postgres",
  });
  await client.connect();
  try {
    const existing = await client.query("select 1 from pg_database where datname = $1", [
      DB.database,
    ]);
    if (existing.rowCount === 0) {
      // CREATE DATABASE takes no parameters, so the identifier is quoted
      // instead. `DB.database` is a constant in this file, not user input.
      await client.query(`create database "${DB.database}"`);
    }
  } finally {
    await client.end();
  }
}

export function stopEmbedded() {
  const bin = embeddedBinDir();
  const result = run(join(bin, "pg_ctl"), ["-D", DATA_DIR, "-m", "fast", "stop"]);
  return result.status === 0;
}

/* ------------------------------------------------------------------- entry */

/**
 * Bring a Postgres 16 up and return once it accepts connections. Docker is the
 * documented path; the embedded build is the no-Docker fallback.
 */
export async function ensurePostgres({ quiet = false } = {}) {
  const log = (message) => {
    if (!quiet) console.log(message);
  };

  // Something is already serving the port — a previous `pnpm dev`, or a
  // Postgres supplied by the environment (CI uses a service container). Either
  // way, starting a second one would just fight over 5432.
  if (await portOpen({ host: DB.host, port: DB.port })) {
    log(`[db] PostgreSQL already listening on ${DB.host}:${DB.port}`);
    return "existing";
  }

  let backend;
  if (process.env["TEACHERLY_PG_BACKEND"] === "embedded") {
    log("[db] starting embedded PostgreSQL 16 (forced by TEACHERLY_PG_BACKEND)");
    backend = startEmbedded();
  } else if (dockerAvailable()) {
    log("[db] starting PostgreSQL 16 via docker compose");
    backend = startWithDocker();
  } else {
    log("[db] Docker not found — falling back to the embedded PostgreSQL 16 build");
    backend = startEmbedded();
  }

  await waitForPort({ host: DB.host, port: DB.port });
  if (backend === "embedded") await ensureDatabaseExists();

  log(`[db] PostgreSQL ready on ${DB.host}:${DB.port} (${backend})`);
  return backend;
}
