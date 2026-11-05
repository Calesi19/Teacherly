import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { WEB_ROOT } from "./postgres.mjs";

/**
 * Guardrail for constraint 1: `packages/core` holds domain logic with no
 * transport and no SQL — plus the `TeacherId` minting rule and the rule that
 * grading happens in exactly one module.
 *
 * Five independent checks, because each alone has a hole:
 *   1. The manifest check catches a declared dependency even if no file imports
 *      it yet.
 *   2. The import scan catches an import that reaches a package through a
 *      parent's node_modules without ever being declared.
 *   3. The TeacherId scan catches code that mints its own teacher id, which
 *      the type system cannot prevent on its own because a cast always can.
 *   4. The raw-body scan catches `c.req.json()`, which is typed `any` — and
 *      `any` satisfies a branded type with no cast at all, so check 3 has
 *      nothing to find. This is the hole check 3 cannot see.
 *   5. The grading scan catches a second percentage, letter or rounding
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

/**
 * `//` and block comments removed, so the prose in this repo — which quotes
 * `as TeacherId` and `c.req.json()` when explaining why they are banned — does
 * not trip the textual scans below.
 */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
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

/* 3. TeacherId minting, and 4. raw request bodies ------------------------- */

/**
 * A `TeacherId` may only be created where one is read out of the `teachers`
 * table. `packages/db` does that declaratively, with Drizzle's `$type` on the
 * `id` and `teacher_id` columns, so it needs no cast; the in-memory fakes in
 * `packages/core/src/testing` are the only other mint site, and
 * `asTeacherId` itself is where the one sanctioned cast lives.
 *
 * Nowhere else is allowed to mint one. Code that could would be naming a
 * workspace from data it was handed instead of from the resolved session, which
 * is exactly the isolation property this chunk exists to establish. The brand
 * alone cannot stop it — `as TeacherId` is always available — so the casts are
 * banned textually here, where no inline comment can disable them.
 *
 * Two things were wrong with the first version of this, both found by CAL-9:
 *
 *   - it listed three spellings and missed the fourth. `<TeacherId>raw` is the
 *     same assertion in TypeScript's older syntax, and it passed;
 *   - it walked `apps/` only, while the rule it states covers everything
 *     outside `packages/db` and the fakes, so a cast in `packages/pdf` was
 *     unchecked. It now walks `packages/*​/src` too.
 */
const TEACHER_ID_MINTS = [
  { pattern: /\basTeacherId\s*\(/, what: "calls asTeacherId(...)" },
  { pattern: /\bas\s+unknown\s+as\s+TeacherId\b/, what: "casts with `as unknown as TeacherId`" },
  { pattern: /\bas\s+TeacherId\b/, what: "casts with `as TeacherId`" },
  {
    // `<TeacherId>expr`. The leading character class is what keeps generics
    // out of it: `Promise<TeacherId>` and `$type<TeacherId>()` have an
    // identifier immediately before the `<`, an assertion never does. A
    // trailing operand is required for the same reason.
    pattern: /(?:^|[^\w$)\]>])<\s*TeacherId\s*>\s*[\w$(["'`]/m,
    what: "casts with an angle-bracket `<TeacherId>` assertion",
  },
];

/**
 * Where minting is legitimate, by path prefix.
 *
 * `packages/db` is the real mint site; the fakes stand in for it in tests;
 * `domain/teacher.ts` is `asTeacherId` itself. `session-middleware.ts` does
 * not currently need to mint — `Teacher.id` arrives branded from the
 * repository — but it is the one place under `apps/` where doing so would be
 * legitimate, and allowing it keeps the rule's intent readable rather than
 * looking like a blanket ban with no sanctioned path.
 */
const MINT_ALLOWED_PREFIXES = [
  join("packages", "db"),
  join("packages", "core", "src", "testing"),
  join("packages", "core", "src", "domain", "teacher.ts"),
  join("apps", "server", "src", "http", "session-middleware.ts"),
];

/**
 * `c.req.json()` is typed `any`, and `any` satisfies every type — including a
 * branded one — with no cast for the scan above to find and nothing for a
 * reviewer to notice:
 *
 *     const body = await c.req.json();          // any
 *     const victim: TeacherId = body.teacherId; // compiles. no cast.
 *
 * So the brand's guarantee only holds as far as request bodies are typed.
 * Everything goes through `readJson`, which returns `Record<string, unknown>`
 * and makes that second line a type error again — and which is also where the
 * JSON content-type and `Sec-Fetch-Site` checks live, so a route that reads
 * the body itself loses those too.
 */
const RAW_BODY_READER = join("apps", "server", "src", "http", "json.ts");
const RAW_BODY_PATTERN = /\bc\s*\.\s*req\s*\.\s*(?:json|parseBody)\s*\(/;

/** Every source tree the two rules above cover: both halves of the workspace. */
function scannedSourceDirs() {
  const dirs = [];
  for (const area of ["packages", "apps"]) {
    const areaDir = join(WEB_ROOT, area);
    for (const name of existsSync(areaDir) ? readdirSync(areaDir) : []) {
      const srcDir = join(areaDir, name, "src");
      if (existsSync(srcDir)) dirs.push(srcDir);
    }
  }
  return dirs;
}

for (const srcDir of scannedSourceDirs()) {
  for (const file of sourceFiles(srcDir)) {
    const where = relative(WEB_ROOT, file);
    // Comments in this repo quote both banned spellings while explaining them.
    const source = stripComments(readFileSync(file, "utf8"));

    if (!MINT_ALLOWED_PREFIXES.some((prefix) => where.startsWith(prefix))) {
      // Routes are called out separately: that is where an attacker-supplied id
      // would actually arrive, so the message should say so.
      const inRoutes = where.includes(`${sep}src${sep}routes${sep}`);

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

    if (where !== RAW_BODY_READER && RAW_BODY_PATTERN.test(source)) {
      problems.push(
        `${where}: reads the request body directly — call readJson from ` +
          `apps/server/src/http/json.ts, which types it Record<string, unknown> ` +
          `and applies the content-type and Sec-Fetch-Site checks`,
      );
    }
  }
}

/* 5. one grading module -------------------------------------------------- */

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
      "a request body may only be read through readJson, which types it;\n" +
      "and every percentage, letter and rounding decision belongs to packages/core/src/grading.\n" +
      "Declare a port in packages/core/src/ports and implement it in packages/db or apps/server.\n",
  );
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  console.error(`\n${problems.length} violation(s).`);
  process.exit(1);
}

console.log(
  "core-purity check passed: packages/core imports no transport, driver or crypto,\n" +
    "nothing outside packages/db and the core test fakes mints a TeacherId,\n" +
    "no route reads a request body without going through readJson,\n" +
    "and no package outside packages/core/src/grading computes a percentage, a letter or a rounding.",
);
