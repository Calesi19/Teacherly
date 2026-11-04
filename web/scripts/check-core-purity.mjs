import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { WEB_ROOT } from "./postgres.mjs";

/**
 * Guardrail for constraint 1: `packages/core` holds domain logic with no
 * transport and no SQL — plus the `TeacherId` minting rule and the rule that
 * grading happens in exactly one module.
 *
 * Four independent checks, because each alone has a hole:
 *   1. The manifest check catches a declared dependency even if no file imports
 *      it yet.
 *   2. The import scan catches an import that reaches a package through a
 *      parent's node_modules without ever being declared.
 *   3. The TeacherId scan catches a route that mints its own teacher id, which
 *      the type system cannot prevent on its own because a cast always can.
 *   4. The grading scan catches a second percentage, letter or rounding
 *      decision anywhere in the workspace. A module boundary cannot stop that
 *      one: `Math.round(x * 100) / 100` needs no import.
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

/* 4. one grading module -------------------------------------------------- */

/**
 * A percentage, a letter and a rounding decision are made in
 * `packages/core/src/grading` and nowhere else.
 *
 * This is the rule the chunk exists to establish, and it is the one the type
 * system is least able to help with: the desktop app's three contradictory
 * formulas were not three imports of a shared module that drifted, they were
 * three independent arithmetic expressions written in three files — a
 * `reduce` in a hook, a `SUM()/SUM()` in a report query, and a
 * `(score / max) * 100` in a component. None of them imported anything. So the
 * check is textual, over every package and app:
 *
 *   - ROUNDING. `Math.round`, `Math.floor`, `Math.ceil`, `Math.trunc` and
 *     `toFixed` are how a second rounding path gets written. The grading
 *     module rounds exactly once, half-up, on integers; anything else rounding
 *     a grade is by definition a disagreement with it. The desktop app's
 *     `formatScorePercentage` is a `Math.floor` and is exactly why the PDF
 *     printed "89.9" beside a letter decided from 89.995.
 *   - CUTOFFS. The literals 90, 80, 70 and 60 in a comparison are a hard-coded
 *     A–F scale. The desktop app has them in six places, which is why a
 *     per-class scale is not a feature anyone could add there. Cutoffs now come
 *     from the class, and `DEFAULT_GRADING_SCALE` is the only place those four
 *     numbers are written down.
 *   - LETTER BANDS. An `["A", "B", "C", "D", "F"]`-shaped literal outside the
 *     grading module is a reimplementation of `LETTERS` and almost certainly of
 *     `letterFor` with it.
 *
 * Comments are stripped before matching, so the prose in this repo that
 * discusses `* 100` or quotes an old formula does not trip it. Test files are
 * scanned too: a test that computed its own expected percentage would be
 * asserting the formula against itself.
 */
const GRADING_DIR = join("packages", "core", "src", "grading");

/**
 * Rounding that is not a grading decision, allowed by name with a reason.
 *
 * Kept as an explicit list rather than a pattern so that each entry is a
 * decision somebody made and a reviewer can see. If a screen in a later chunk
 * needs `Math.floor` for layout, it is added here with its reason — the point
 * is not that rounding is banned, it is that rounding a *grade* outside the
 * grading module is.
 */
const ROUNDING_ALLOWED = new Map([
  [
    join("apps", "server", "src", "http", "rate-limit.ts"),
    "Retry-After is a whole number of seconds, not a grade",
  ],
]);

/** `//` and `/* *​/` removed, so documentation can discuss the old formulas. */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const GRADING_RULES = [
  {
    pattern: /\bMath\.(?:round|floor|ceil|trunc)\s*\(|\.toFixed\s*\(/,
    what: "rounds a number",
    allow: ROUNDING_ALLOWED,
    advice:
      "a grade is rounded once, in packages/core/src/grading/percentage.ts — " +
      "call percentageOf or one of the gradeX functions instead",
  },
  {
    pattern: /[<>]=?\s*(?:90|80|70|60)(?![.\d])/,
    what: "compares against a hard-coded grading cutoff",
    advice:
      "cutoffs are per-class — take a GradingScale and call letterFor, " +
      "or read DEFAULT_GRADING_SCALE if you need the default",
  },
  {
    pattern: /\[\s*"A"\s*,\s*"B"\s*,\s*"C"\s*,\s*"D"\s*,\s*"F"\s*\]/,
    what: "redefines the letter bands",
    advice: "import LETTERS and letterFor from the grading module",
  },
];

for (const area of ["packages", "apps"]) {
  const areaDir = join(WEB_ROOT, area);
  for (const name of existsSync(areaDir) ? readdirSync(areaDir) : []) {
    const srcDir = join(areaDir, name, "src");
    if (!existsSync(srcDir)) continue;

    for (const file of sourceFiles(srcDir)) {
      const where = relative(WEB_ROOT, file);
      // The grading module is where all of this is supposed to live.
      if (where.startsWith(GRADING_DIR)) continue;

      const source = stripComments(readFileSync(file, "utf8"));
      for (const rule of GRADING_RULES) {
        if (!rule.pattern.test(source)) continue;
        if (rule.allow?.has(where)) continue;
        problems.push(`${where}: ${rule.what} outside the grading module — ${rule.advice}`);
      }
    }
  }
}

/* report ------------------------------------------------------------------ */

if (problems.length > 0) {
  console.error("core-purity check FAILED\n");
  console.error(
    "packages/core must contain domain logic only — no HTTP, no SQL, no driver, no crypto;\n" +
      "a TeacherId may only be minted where one is read from the teachers table;\n" +
      "and every percentage, letter and rounding decision belongs to packages/core/src/grading.\n" +
      "Declare a port in packages/core/src/ports and implement it in packages/db or apps/server.\n",
  );
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  console.error(`\n${problems.length} violation(s).`);
  process.exit(1);
}

console.log(
  "core-purity check passed: packages/core imports no transport, driver or crypto,\n" +
    "no app outside session resolution mints a TeacherId,\n" +
    "and no package outside packages/core/src/grading computes a percentage, a letter or a rounding.",
);
