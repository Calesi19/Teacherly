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

You need **Node 22+**, **pnpm 10+** and **Docker** (optional — see the fallback
below). Running the *e2e* suite additionally needs Playwright's browser and its
OS libraries, which on Linux needs root once: see
[Playwright's browser](#playwrights-browser-and-its-os-libraries).

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
| `pnpm test` | Vitest — the `packages/core` domain suite and the `apps/server` route suite |
| `pnpm test:e2e` | Playwright — starts the stack itself and drives a real browser |
| `pnpm check:core-purity` | The core-purity guardrail (see below) |
| `pnpm check` | Guardrail + typecheck + unit tests, the pre-push set |
| `pnpm build` | Typecheck, then a production client build |
| `pnpm db:up` / `pnpm db:down` | Start / stop Postgres without the app |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:generate` | Generate a migration after editing `packages/db/src/schema.ts` |

### Playwright's browser, and its OS libraries

Playwright needs its browser once. On a clean Linux box **`install chromium`
alone is not enough** — the downloaded `chrome-headless-shell` is dynamically
linked and fails at launch with `error while loading shared libraries:
libglib-2.0.so.0`, which makes *every* e2e test fail at `browserType.launch`.

```bash
sudo pnpm exec playwright install --with-deps chromium
```

`--with-deps` installs the system packages the browser links against and
therefore **needs root** (it runs `apt-get` under the hood). This is a missing
OS dependency, not a broken test. On macOS and Windows the plain
`pnpm exec playwright install chromium` is sufficient.

#### Without root

If you cannot become root — a hardened CI image, a sandboxed agent — the suite
can still run. Unpack the dependencies into a prefix you own and point the
dynamic loader and fontconfig at it:

```bash
# 1. Download and unpack the .deb closure to a writable prefix (no install).
#    libglib, libnss3, libnspr4, libdbus-1, libatk*, libcups, libdrm,
#    libxkbcommon, libxcomposite/damage/fixes/randr, libgbm, libpango,
#    libcairo, libasound2 and fonts-liberation.
apt-get download <packages>   # or `apt-get -d install`, then `dpkg -x` each
dpkg -x <each>.deb "$PREFIX/root"

# 2. Tell the loader where they are.
export LD_LIBRARY_PATH="$PREFIX/root/usr/lib/$(uname -m)-linux-gnu:$PREFIX/root/lib/$(uname -m)-linux-gnu"

# 3. Fontconfig is the easy one to miss. Without a readable config and at
#    least one font, Chromium starts and then dies rendering text with
#    `FATAL: SkFontMgr_FontConfigInterface ... Not implemented`, which looks
#    like a hung page rather than a missing font. Point it at the prefix:
export FONTCONFIG_FILE="$PREFIX/fonts.conf"   # <dir> the prefix's font path,
                                              # <cachedir> something writable
```

Verified on arm64 Linux as a non-root user: all four e2e tests pass this way.

### Changing the dev client's port

`DEV_CLIENT_PORT` (default `5173`) is read by `apps/web/vite.config.ts`,
`playwright.config.ts` and the server's `DEV_CLIENT_ORIGIN` default, so one
value moves all three. Set it in `web/.env` if something already holds 5173;
`strictPort` stays on deliberately, because silently sliding to 5174 would
desynchronize the client from `DEV_CLIENT_ORIGIN` and break credentialed CORS
in a way that is much harder to diagnose than a refusal to start.

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

`pnpm check:core-purity` enforces this in three independent ways: it rejects a
forbidden name in `packages/core/package.json` even if nothing imports it yet,
it scans every source file for a forbidden import even if it was never
declared, and it fails the build if anything under `apps/*/src` mints a
`TeacherId` (see constraint 2). It is a plain script rather than an ESLint rule
so that it cannot be silenced with an inline comment.

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

**`TeacherId` is a branded type, so that last sentence is checked rather than
promised.** It was `export type TeacherId = string`, which documented the
intent and enforced nothing — `c.req.query("teacherId")` satisfied it exactly
as well as a session-resolved id did, and a route that passed one straight to
`sessions.revoke` compiled cleanly. It is now
`string & { readonly [teacherIdBrand]: "TeacherId" }`, minted in exactly two
places: `packages/db/src/schema.ts`, which types the `id` and `teacher_id`
columns with Drizzle's `$type` so reading a row *is* the mint, and the
in-memory fakes in `packages/core/src/testing`. Nothing under `apps/` mints
one at all. Because a brand alone can always be defeated with
`as unknown as TeacherId`, `pnpm check:core-purity` also fails the build on any
such cast under `apps/*/src`. A handler therefore cannot invent a teacher id;
it can only receive one a repository already produced.

## Authentication

- **Passwords:** argon2id via `argon2@0.45`, using that library's current
  defaults rather than numbers we picked: **m=65536 KiB (64 MiB), t=3, p=4**,
  hash length 32, salt length 16, version 0x13. Only `type: argon2id` is passed
  explicitly, so the cost parameters keep tracking the library's recommendation.
- **Minimum password length: 12.** Above the NIST SP 800-63B floor of 8 because
  this chunk has no second factor. Capped at 1024 so a request body cannot turn
  argon2 into a CPU-exhaustion primitive.
- **Passwords are Unicode-normalized to NFC** before they are measured or
  hashed, on signup and login alike. "é" can be encoded as one code point or as
  "e" plus a combining accent, and argon2 hashes bytes — without this, a
  teacher whose keyboard emits NFD (several macOS/iOS keyboards and IMEs do)
  could sign up on one device and be permanently locked out on another, with no
  password reset in this chunk to recover.
- **Rate limiting on `/api/auth/*`:** a fixed-window counter, 30 requests per
  minute per client IP and 10 per 15 minutes per email address, returning
  `429 {"error":{"code":"rate_limited"}}` with `Retry-After`. The per-IP
  counter bounds argon2id's memory cost (64 MiB and ~330ms per attempt, with no
  concurrency cap, is a denial-of-service lever as much as a guessing one); the
  per-email counter bounds guessing against one account spread across many
  source addresses. The IP is the socket's remote address — `X-Forwarded-For`
  is deliberately ignored, since nothing in front of this server is trusted to
  set it and honouring it would let a caller reset their own counter.

  > **In-process only.** The counters live in a `Map` in one Node process, so
  > they reset on restart and are not shared between instances: a deployment
  > running N instances effectively gets N times the limit, and a deployment
  > behind a proxy sees the proxy's address for every request. Replacing this
  > with a shared store is a prerequisite for running more than one instance.
- **Sessions:** server-side, in the `sessions` table. The cookie carries a
  256-bit random token; the table stores only its SHA-256, so reading the
  database does not yield live sessions. Plain SHA-256 is correct here — the
  input is uniform randomness, so there is no guessable space to slow down.
- **Absolute expiry of 14 days, no rolling refresh.** `last_used_at` is
  recorded but never extends `expires_at`.
- **Cookie:** `httpOnly`, `SameSite=Lax`, `Path=/api` (the SPA's own documents
  never need the credential). It carries nothing but the opaque token.
- **`Secure` is on unless you ask for it to be off.** Only the exact value
  `COOKIE_SECURE=false` turns it off, and that is refused at startup when
  `NODE_ENV=production`, so a stray `.env` cannot follow a build into a deploy
  and quietly strip `Secure` from a 14-day session cookie. Omitting the
  variable — or forgetting it exists — leaves the cookie `Secure`. No
  `__Host-` prefix: it would require `Path=/`, which conflicts with the
  deliberate `Path=/api` above.
- **JSON-only, same-site-only writes.** Every request body is read through one
  shared helper, which requires `Content-Type: application/json` (`415`
  otherwise) and rejects a request whose `Sec-Fetch-Site` is present and
  neither `same-origin` nor `none` (`403`). Without the first of those, a
  cross-site `<form enctype="text/plain">` reached `/api/auth/login` with no
  CORS preflight and got back a `Set-Cookie`: `SameSite` governs when a cookie
  is *sent*, not whether it may be *set*, so a teacher who merely loaded an
  attacker's page had the attacker's session installed for `/api`.
  `Sec-Fetch-Site` is absent on non-browser clients, so curl still works.
- **Logout revokes server-side**, setting `revoked_at`, and only then clears the
  cookie. The e2e suite asserts `/api/me` returns 401 afterwards.
- **No account enumeration on login.** An unknown email and a wrong password
  both return the identical `401 {"error":{"code":"invalid_credentials"}}`, and
  login verifies against a per-process decoy argon2id hash when the email is
  unknown, so neither branch is measurably faster than the other.
- **Signup answers identically whether or not the address is taken:**
  `201 {"ok":true}`, same status, same body, same content type. It used to
  return `201` for a free address and `401` for a registered one, which made
  the status code a single-request account-existence oracle for an
  unauthenticated caller. The client learns who it is from `GET /api/me`
  afterwards, which is why signup's body no longer carries the teacher.

  > **Partly open, on purpose.** Two signals remain: only a genuine signup
  > sets the session cookie, and probing an address still *registers* it,
  > which is a durable denial of registration against a real teacher. Closing
  > either needs proof of address control — email verification or invite
  > codes — which is a pending product decision, not an oversight. See the
  > note on the route in `apps/server/src/routes/auth-routes.ts`.
- **Email is normalized once** (trim + lowercase) inside
  `normalizeEmail`, applied in the repository rather than at call sites. The
  `teachers` table has a unique index on `email` *and* a
  `CHECK (email = lower(email))` constraint, so case-insensitive uniqueness is
  genuinely enforced rather than merely implied.

### API

| Route | Notes |
| --- | --- |
| `POST /api/auth/signup` | `{email, password, displayName, locale?}` → `201 {"ok":true}`, identical whether or not the address was taken; sets the cookie only on a real signup |
| `POST /api/auth/login` | `{email, password}` → 200, sets cookie |
| `POST /api/auth/logout` | Requires a session. Revokes it, clears the cookie → 204 |
| `GET /api/me` | Requires a session → `{teacher}` |
| `GET /api/health` | Liveness only, no database touch |

## Tests

- **`pnpm test`** — 45 Vitest cases, no database and no argon2.
  26 over the `packages/core` auth service against in-memory fake
  repositories: duplicate-email rejection, wrong-password rejection,
  expired-token rejection, logout revocation (including refusing to revoke
  another teacher's session), and session-expiry arithmetic. 19 more over
  `apps/server`, driving the real `createApp` with `app.request(...)`:
  signup's taken-vs-free responses being byte-identical, the `415`/`403`
  cross-site rejections, the cookie's `Secure` flag and `resolveCookieSecure`
  refusing an insecure cookie in production, the `onError` JSON contract, the
  rate limiter, and the redaction of query parameters from error logs.

  `vitest.config.ts` collects `{packages,apps}/*/src/**/*.test.ts`. It used to
  collect `packages/*` only, so a test file under `apps/` was silently never
  run — which is why several of the findings above went unnoticed.
- **`pnpm test:e2e`** — four Playwright tests against the real stack. The
  happy path (sign up → signed in → sign out → sign in again → `/api/me`); the
  identical-error check for wrong-password versus unknown-email; the Spanish UI
  round trip; and the two-account test, which signs up two teachers in two
  independent browser contexts and asserts each `/api/me` returns only its own
  identity — and then replays Alice's session cookie in a third, empty
  browser context and asserts it resolves to Alice and never to Bob. That
  two-context fixture (`e2e/fixtures.ts`) is the one later chunks reuse for
  classes, grades and notes.

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
- **Auth:** email verification, password reset, OAuth, 2FA, account lockout,
  session listing or "sign out everywhere", rolling session refresh, CSRF
  tokens (`SameSite=Lax`, the enforced JSON content type and the
  `Sec-Fetch-Site` check are the whole defence today). Rate limiting *is*
  present now, but in-process only — see Authentication above.
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
