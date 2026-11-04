import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { WEB_ROOT } from "./postgres.mjs";

/**
 * Guardrail for constraint 1: `packages/core` holds domain logic with no
 * transport and no SQL — plus the `TeacherId` minting rule.
 *
 * Three independent checks, because each alone has a hole:
 *   1. The manifest check catches a declared dependency even if no file imports
 *      it yet.
 *   2. The import scan catches an import that reaches a package through a
 *      parent's node_modules without ever being declared.
 *   3. The TeacherId scan catches a route that mints its own teacher id, which
 *      the type system cannot prevent on its own because a cast always can.
 *
 * Deliberately a plain script rather than an ESLint plugin: it needs to be
 * impossible to disable with an inline comment.
 */

const CORE_DIR = join(WEB_ROOT, "packages", "core");

/** Anything that would make core a transport or a database client. */
const FORBIDDEN_PACKAGES = [
  "hono",
  "@hono/node-server",
  "drizzle-orm",
  "drizzle-kit",
  "pg",
  "postgres",
  "mysql2",
  "better-sqlite3",
  "express",
  "fastify",
  "koa",
  "argon2",
  "@node-rs/argon2",
  "bcrypt",
  "axios",
  "node-fetch",
  "undici",
  "react",
  "@tanstack/react-query",
];

/**
 * Node builtins core must not reach for either. `node:crypto` is on the list on
 * purpose — randomness and hashing go through the `SessionTokenService` and
 * `PasswordHasher` ports, which is what keeps core runnable anywhere.
 */
const FORBIDDEN_BUILTINS = ["node:crypto", "node:fs", "node:http", "node:https", "node:net", "node:dns"];

const problems = [];

/* 1. manifest ------------------------------------------------------------- */

const manifest = JSON.parse(readFileSync(join(CORE_DIR, "package.json"), "utf8"));

for (const field of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
  for (const name of Object.keys(manifest[field] ?? {})) {
    if (FORBIDDEN_PACKAGES.includes(name)) {
      problems.push(`packages/core/package.json: ${field} declares forbidden package "${name}"`);
    }
  }
}

/* 2. imports -------------------------------------------------------------- */

/** `from "x"`, `import("x")`, `require("x")` — enough for this codebase. */
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*)["']([^"']+)["']/g;

function sourceFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules") continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      found.push(...sourceFiles(path));
    } else if (/\.(?:ts|tsx|mts|cts|js|mjs|cjs)$/.test(entry)) {
      found.push(path);
    }
  }
  return found;
}

/** `drizzle-orm/pg-core` must trip the `drizzle-orm` rule too. */
function rootOf(specifier) {
  if (specifier.startsWith("node:")) return specifier;
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

for (const file of sourceFiles(join(CORE_DIR, "src"))) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(SPECIFIER)) {
    const specifier = match[1];
    if (specifier.startsWith(".")) continue;

    const root = rootOf(specifier);
    const where = `${relative(WEB_ROOT, file)}`;

    if (FORBIDDEN_PACKAGES.includes(root)) {
      problems.push(`${where}: imports forbidden package "${specifier}"`);
    } else if (FORBIDDEN_BUILTINS.includes(root)) {
      problems.push(`${where}: imports Node builtin "${specifier}" — use a port instead`);
    } else if (specifier === "vitest" && !file.endsWith(".test.ts")) {
      problems.push(`${where}: imports "vitest" outside a test file`);
    }
  }
}

/* 3. TeacherId minting ---------------------------------------------------- */

/**
 * A `TeacherId` may only be created where one is read out of the `teachers`
 * table. `packages/db` does that declaratively, with Drizzle's `$type` on the
 * `id` and `teacher_id` columns, so it needs no cast; the in-memory fakes in
 * `packages/core/src/testing` are the only other mint site.
 *
 * Nothing under `apps/` is allowed to mint one. A route that could would be
 * naming a workspace from request data instead of from the resolved session,
 * which is exactly the isolation property this chunk exists to establish. The
 * brand alone cannot stop it — `as TeacherId` is always available — so the
 * casts are banned textually here, where no inline comment can disable them.
 */
const TEACHER_ID_MINTS = [
  { pattern: /\basTeacherId\s*\(/, what: "calls asTeacherId(...)" },
  { pattern: /\bas\s+unknown\s+as\s+TeacherId\b/, what: "casts with `as unknown as TeacherId`" },
  { pattern: /\bas\s+TeacherId\b/, what: "casts with `as TeacherId`" },
];

/**
 * The one place in `apps/` where minting would be legitimate: session
 * resolution. It does not currently need to — `Teacher.id` arrives branded
 * from the repository — but allowing it here keeps the rule's intent readable
 * rather than looking like a blanket ban with no sanctioned path.
 */
const APPS_MINT_ALLOWED = join("apps", "server", "src", "http", "session-middleware.ts");

const APPS_DIR = join(WEB_ROOT, "apps");

for (const app of existsSync(APPS_DIR) ? readdirSync(APPS_DIR) : []) {
  const srcDir = join(APPS_DIR, app, "src");
  if (!existsSync(srcDir)) continue;

  for (const file of sourceFiles(srcDir)) {
    const where = relative(WEB_ROOT, file);
    if (where === APPS_MINT_ALLOWED) continue;

    // Routes are called out separately: that is where an attacker-supplied id
    // would actually arrive, so the message should say so.
    const inRoutes = where.includes(`${sep}src${sep}routes${sep}`);
    const source = readFileSync(file, "utf8");

    for (const { pattern, what } of TEACHER_ID_MINTS) {
      if (!pattern.test(source)) continue;
      problems.push(
        inRoutes
          ? `${where}: route ${what} — a handler must never mint a TeacherId; ` +
              `read it from c.get("teacherId"), which sessionMiddleware resolved`
          : `${where}: ${what} — only packages/db and the core test fakes may mint a TeacherId`,
      );
    }
  }
}

/* report ------------------------------------------------------------------ */

if (problems.length > 0) {
  console.error("core-purity check FAILED\n");
  console.error(
    "packages/core must contain domain logic only — no HTTP, no SQL, no driver, no crypto,\n" +
      "and a TeacherId may only be minted where one is read from the teachers table.\n" +
      "Declare a port in packages/core/src/ports and implement it in packages/db or apps/server.\n",
  );
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  console.error(`\n${problems.length} violation(s).`);
  process.exit(1);
}

console.log(
  "core-purity check passed: packages/core imports no transport, driver or crypto,\n" +
    "and no app outside session resolution mints a TeacherId.",
);
