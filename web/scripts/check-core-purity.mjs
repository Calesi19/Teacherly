import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { WEB_ROOT } from "./postgres.mjs";

/**
 * Guardrail for constraint 1: `packages/core` holds domain logic with no
 * transport and no SQL.
 *
 * Two independent checks, because either alone has a hole:
 *   1. The manifest check catches a declared dependency even if no file imports
 *      it yet.
 *   2. The import scan catches an import that reaches a package through a
 *      parent's node_modules without ever being declared.
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

/* report ------------------------------------------------------------------ */

if (problems.length > 0) {
  console.error("core-purity check FAILED\n");
  console.error(
    "packages/core must contain domain logic only — no HTTP, no SQL, no driver, no crypto.\n" +
      "Declare a port in packages/core/src/ports and implement it in packages/db or apps/server.\n",
  );
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  console.error(`\n${problems.length} violation(s).`);
  process.exit(1);
}

console.log("core-purity check passed: packages/core imports no transport, driver or crypto.");
