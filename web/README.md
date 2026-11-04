# Teacherly — web app

A web version of Teacherly for teachers: record grades, keep private notes on
students, generate PDF reports. Login required, one isolated workspace per
teacher. No features for parents or administrators — only the teacher ever sees
this data.

This directory is its own pnpm workspace, separate from the Tauri desktop app at
the repository root. The desktop app is not modified by, and does not depend on,
anything in here.

**This is chunk 1: the skeleton plus real authentication.** There are no
classes, students, assessments, grades or notes yet. See
[Deliberately missing](#deliberately-missing).

## Running it

You need **Node 22+**, **pnpm 10+** and **Docker**. Nothing else.

```bash
cd web
pnpm install
pnpm dev
```

That is the whole setup. `pnpm dev` will:

1. create `web/.env` from `.env.example` if it does not exist,
2. start PostgreSQL 16 (`docker compose up -d postgres`) and wait for it,
3. apply the Drizzle migrations,
4. start the API on <http://localhost:3000> and the client on
   <http://localhost:5173>.

Open <http://localhost:5173>, sign up, and you are in.

> **No Docker?** `pnpm dev` falls back to a PostgreSQL 16 build fetched from npm
> by `pnpm install` (`embedded-postgres`), running it from `web/.pgdata` on the
> same port with the same credentials, so `DATABASE_URL` is correct either way.
> Docker is still the intended path; the fallback exists so CI and sandboxes
> without a Docker daemon can run the full suite. Force it with
> `TEACHERLY_PG_BACKEND=embedded`.

### Other commands

| Command | What it does |
| --- | --- |
| `pnpm typecheck` | `tsc --noEmit` at the root and in all seven packages |
| `pnpm test` | Vitest — the `packages/core` domain suite |
| `pnpm test:e2e` | Playwright — starts the stack itself and drives a real browser |
| `pnpm check:core-purity` | The core-purity guardrail (see below) |
| `pnpm check` | Guardrail + typecheck + unit tests, the pre-push set |
| `pnpm build` | Typecheck, then a production client build |
| `pnpm db:up` / `pnpm db:down` | Start / stop Postgres without the app |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:generate` | Generate a migration after editing `packages/db/src/schema.ts` |

Playwright needs its browser once: `pnpm exec playwright install chromium`.

## Layout

```
web/
  apps/web          React client (Vite, React Router, TanStack Query)
  apps/server       Hono API, session auth, argon2id
  apps/mcp          MCP stdio server — typed stub in this chunk
  packages/core     domain logic: no HTTP, no SQL, no crypto
  packages/db       Drizzle schema, migrations, repository implementations
  packages/pdf      report template — typed stub in this chunk
  packages/i18n     typed EN/ES translations, no i18n library
```

### The two constraints this chunk exists to prove

**1. `packages/core` holds domain logic with no transport and no SQL.** It has
no runtime dependencies at all. It does not import `hono`, `drizzle-orm`, `pg`,
any HTTP client — or `node:crypto`. Randomness and hashing go through the
`SessionTokenService` and `PasswordHasher` ports, so the domain is runnable
anywhere and testable without a database.

`pnpm check:core-purity` enforces this in two independent ways: it rejects a
forbidden name in `packages/core/package.json` even if nothing imports it yet,
and it scans every source file for a forbidden import even if it was never
declared. It is a plain script rather than an ESLint rule so that it cannot be
silenced with an inline comment.

**2. All data access sits behind repository interfaces, and workspace isolation
is enforced in one place.** The ports are declared in
`packages/core/src/ports/`; `packages/db` implements them with Drizzle;
`apps/server/src/container.ts` is the only place the three meet.

Every repository method that touches teacher-owned data takes a teacher id and
filters on it *inside* `packages/db` — `revoke` is scoped by `teacherId` as well
as `sessionId`, and `findActiveByTokenHash` applies the revoked/expired filter
in the query rather than returning a row for the caller to check. On the HTTP
side, `sessionMiddleware` resolves the request's teacher exactly once, and
`c.get("teacherId")` is the only way downstream code can name one: there is no
route that reads a teacher id from a body, a query string or a header.

## Authentication

- **Passwords:** argon2id via `argon2@0.45`, using that library's current
  defaults rather than numbers we picked: **m=65536 KiB (64 MiB), t=3, p=4**,
  hash length 32, salt length 16, version 0x13. Only `type: argon2id` is passed
  explicitly, so the cost parameters keep tracking the library's recommendation.
- **Minimum password length: 12.** Above the NIST SP 800-63B floor of 8 because
  this chunk has no rate limiting and no second factor, so length is the only
  brake on online guessing. Capped at 1024 so a request body cannot turn argon2
  into a CPU-exhaustion primitive.
- **Sessions:** server-side, in the `sessions` table. The cookie carries a
  256-bit random token; the table stores only its SHA-256, so reading the
  database does not yield live sessions. Plain SHA-256 is correct here — the
  input is uniform randomness, so there is no guessable space to slow down.
- **Absolute expiry of 14 days, no rolling refresh.** `last_used_at` is
  recorded but never extends `expires_at`.
- **Cookie:** `httpOnly`, `SameSite=Lax`, `Path=/api` (the SPA's own documents
  never need the credential), `Secure` whenever `NODE_ENV=production` or
  `COOKIE_SECURE=true`. It carries nothing but the opaque token.
- **Logout revokes server-side**, setting `revoked_at`, and only then clears the
  cookie. The e2e suite asserts `/api/me` returns 401 afterwards.
- **No account enumeration.** An unknown email, a wrong password and a signup
  for an address that already exists all return the identical
  `401 {"error":{"code":"invalid_credentials"}}`. Signup hashes the password
  even when it already knows the address is taken, and login verifies against a
  per-process decoy argon2id hash when the email is unknown, so neither branch
  is measurably faster than the other.
- **Email is normalized once** (trim + lowercase) inside
  `normalizeEmail`, applied in the repository rather than at call sites. The
  `teachers` table has a unique index on `email` *and* a
  `CHECK (email = lower(email))` constraint, so case-insensitive uniqueness is
  genuinely enforced rather than merely implied.

### API

| Route | Notes |
| --- | --- |
| `POST /api/auth/signup` | `{email, password, displayName, locale?}` → 201, sets cookie |
| `POST /api/auth/login` | `{email, password}` → 200, sets cookie |
| `POST /api/auth/logout` | Requires a session. Revokes it, clears the cookie → 204 |
| `GET /api/me` | Requires a session → `{teacher}` |
| `GET /api/health` | Liveness only, no database touch |

## Tests

- **`pnpm test`** — 26 Vitest cases over the `packages/core` auth service,
  against in-memory fake repositories, no database. Covers duplicate-email
  rejection, wrong-password rejection, expired-token rejection, logout
  revocation (including refusing to revoke another teacher's session), and
  session-expiry arithmetic.
- **`pnpm test:e2e`** — four Playwright tests against the real stack. The
  happy path (sign up → signed in → sign out → sign in again → `/api/me`); the
  identical-error check for wrong-password versus unknown-email; the Spanish UI
  round trip; and the two-account test, which signs up two teachers in two
  independent browser contexts and asserts each `/api/me` returns only its own
  identity. That two-context fixture (`e2e/fixtures.ts`) is the one later
  chunks reuse for classes, grades and notes.

## Internationalization

`packages/i18n` is a plain typed object — no library. `en` is the source of
truth: `Translations = typeof en`, and `es` is declared as `Translations`, so a
key added to English that is missing or misspelled in Spanish is a
`pnpm typecheck` failure.

The strings in `common`, `sidebar.tagline` and `settings.language*` are ported
verbatim from the desktop app's `src/i18n/translations.ts`. The `auth` and
`home` blocks are new — the desktop app is offline and has no login, so it had
no auth strings to copy.

The client uses the signed-in teacher's stored `locale`; before sign-up there is
no teacher to ask, so the toggle on the auth screens remembers the choice
locally and sends it along with signup.

## Deliberately missing

Out of scope for this chunk, and **not** oversights:

- **Product:** classes, students, assessments, grades, notes, the PDF report
  (`packages/pdf` is a typed stub), the MCP tools (`apps/mcp` is a typed stub).
- **Auth:** email verification, password reset, OAuth, 2FA, **rate limiting**,
  account lockout, session listing or "sign out everywhere", rolling session
  refresh, CSRF tokens (`SameSite=Lax` plus a JSON-only API is the whole
  defence today).
- **Operations:** deployment, hosting, email sending, structured logging,
  metrics, backups, a session-cleanup job for expired rows.
- **Frontend:** a design system. `styles.css` is deliberately minimal.
- **Tooling:** ESLint and Prettier. TypeScript `strict` (plus
  `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`) is the only
  static check, alongside the core-purity guardrail.

## Vocabulary

The desktop app's names are retired in this schema: `groups` → `classes`,
`assignments` → `assessments`, `assignment_scores` → `grades`,
`assignments.period_name` → `assessments.course_name`.

## Secrets

There are none in the repository. `.env` is gitignored; `.env.example` holds
local-development placeholders only, and the Postgres credentials in it match
`docker-compose.yml` because that database only ever exists on a developer's own
machine. Production reads `DATABASE_URL` from the environment.
