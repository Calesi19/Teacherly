import { AuthService, GradebookService, SchoolService } from "@teacherly/core";
import {
  FakePasswordHasher,
  FakeSessionTokenService,
  InMemorySessionRepository,
  InMemoryTeacherRepository,
  MutableClock,
  createSchoolFakes,
} from "@teacherly/core/testing";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp, type AppDeps } from "./app";
import { resolveCookieSecure } from "./config";

/**
 * Route-level tests over the real `createApp`, driven by `app.request(...)`.
 *
 * These exist because `vitest.config.ts` used to collect
 * `packages/*​/src/**​/*.test.ts` only, so anything under `apps/` was silently
 * never run — and that is why the findings these cover went unnoticed. No
 * database and no argon2: `AuthService` takes in-memory fakes, which is the
 * whole point of the ports in `packages/core`.
 */

const PASSWORD = "correct-horse-battery";
const DECOY_HASH = "fake$a-value-nobody-knows";

/**
 * The teacher-owned half of `AppDeps`, over in-memory repositories.
 *
 * These tests are about auth and the error contract and never touch a class,
 * but `createApp` now requires the services, so they are supplied rather than
 * stubbed — a stub would be a second definition of the dependency to keep in
 * step. See `./testing/fixtures.ts` for the fixture the school route tests use.
 */
function schoolDeps(): Pick<AppDeps, "school" | "gradebook"> {
  const repositories = createSchoolFakes();
  return {
    school: new SchoolService(repositories),
    gradebook: new GradebookService(repositories),
  };
}

function makeApp(overrides: Partial<AppDeps> = {}) {
  const auth = new AuthService({
    teachers: new InMemoryTeacherRepository(),
    sessions: new InMemorySessionRepository(),
    passwordHasher: new FakePasswordHasher(),
    sessionTokens: new FakeSessionTokenService(),
    clock: new MutableClock(new Date("2026-01-15T09:00:00.000Z")),
    decoyPasswordHash: DECOY_HASH,
  });
  return createApp({ auth, ...schoolDeps(), cookie: { secure: false }, ...overrides });
}

/** Sign a teacher up and return the session cookie the app issued. */
async function sessionCookieFor(
  app: ReturnType<typeof makeApp>,
  email: string,
): Promise<string> {
  const response = await app.request(signupRequest(email));
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  if (cookie === undefined) throw new Error(`signup for ${email} issued no cookie`);
  return cookie;
}

/** A well-formed signup, as the real client sends it. */
function signupRequest(email: string): Request {
  return new Request("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD, displayName: "A Teacher" }),
  });
}

describe("POST /api/auth/signup — account-existence oracle", () => {
  it("answers a taken address exactly as it answers a free one", async () => {
    const app = makeApp();

    const first = await app.request(signupRequest("taken@school.test"));
    expect(first.status).toBe(201);

    // Same address again: already registered.
    const taken = await app.request(signupRequest("taken@school.test"));
    // A different address: free.
    const free = await app.request(signupRequest("free@school.test"));

    // The finding: 201 for free, 401 for taken made the status code a
    // single-request account-existence oracle for an unauthenticated caller.
    expect(taken.status).toBe(free.status);
    expect(taken.status).toBe(201);

    // Same body, byte for byte, not merely the same shape.
    expect(await taken.text()).toBe(await free.text());

    // And the same content type, so the two cannot be told apart by headers
    // other than the session cookie the free one legitimately carries.
    expect(taken.headers.get("content-type")).toBe(free.headers.get("content-type"));
  });

  it("still issues a session for a free address, and none for a taken one", async () => {
    const app = makeApp();
    await app.request(signupRequest("first@school.test"));

    const free = await app.request(signupRequest("second@school.test"));
    const taken = await app.request(signupRequest("first@school.test"));

    // The residual, documented signal: only a real signup sets the cookie.
    // Closing this needs proof of address control, which is a deferred
    // product decision — see the note on the route.
    expect(free.headers.get("set-cookie")).toContain("teacherly_session=");
    expect(taken.headers.get("set-cookie")).toBeNull();
  });

  it("still reports a validation failure, which carries no existence signal", async () => {
    const app = makeApp();
    const response = await app.request(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "not-an-email", password: "x", displayName: "" }),
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "validation_failed" } });
  });
});

describe("cross-site request rejection", () => {
  it("rejects a text/plain login with 415", async () => {
    const app = makeApp();

    // The attack: `<form enctype="text/plain">` posts cross-site with no CORS
    // preflight, and Hono's `c.req.json()` is `JSON.parse(await text())` with
    // no content-type check, so this used to return 200 and a Set-Cookie.
    const response = await app.request(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8", Origin: "https://evil.example" },
        body: JSON.stringify({ email: "victim@school.test", password: PASSWORD }),
      }),
    );

    expect(response.status).toBe(415);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects a cross-site JSON login via Sec-Fetch-Site", async () => {
    const app = makeApp();
    const response = await app.request(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Sec-Fetch-Site": "cross-site",
        },
        body: JSON.stringify({ email: "victim@school.test", password: PASSWORD }),
      }),
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("still accepts same-origin and non-browser callers", async () => {
    const app = makeApp();
    await app.request(signupRequest("real@school.test"));

    for (const headers of [
      // A browser on our own origin.
      { "Content-Type": "application/json", "Sec-Fetch-Site": "same-origin" },
      // curl and the Playwright API context send no Sec-Fetch-Site at all.
      { "Content-Type": "application/json" },
    ]) {
      const response = await app.request(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers,
          body: JSON.stringify({ email: "real@school.test", password: PASSWORD }),
        }),
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("set-cookie")).toContain("teacherly_session=");
    }
  });
});

describe("session cookie Secure flag", () => {
  it("emits Secure when createApp is given secure cookies", async () => {
    const app = makeApp({ cookie: { secure: true } });
    const response = await app.request(signupRequest("secure@school.test"));
    expect(response.headers.get("set-cookie")).toContain("Secure");
  });

  it("omits Secure only when explicitly asked to", async () => {
    const app = makeApp({ cookie: { secure: false } });
    const response = await app.request(signupRequest("insecure@school.test"));
    expect(response.headers.get("set-cookie")).not.toContain("Secure");
  });

  // `resolveCookieSecure` rather than `loadConfig()` on purpose: `loadConfig`
  // reads web/.env off disk through dotenv, so a developer's local file would
  // decide the result and the test would pass or fail by accident.
  it("defaults to secure when NODE_ENV is unset", () => {
    expect(resolveCookieSecure({})).toBe(true);
    expect(resolveCookieSecure({ NODE_ENV: undefined })).toBe(true);
  });

  it("treats anything other than the exact string \"false\" as secure", () => {
    expect(resolveCookieSecure({ COOKIE_SECURE: "" })).toBe(true);
    expect(resolveCookieSecure({ COOKIE_SECURE: "FALSE" })).toBe(true);
    expect(resolveCookieSecure({ COOKIE_SECURE: "0" })).toBe(true);
    expect(resolveCookieSecure({ COOKIE_SECURE: "no" })).toBe(true);
  });

  it("honours an explicit opt-out outside production", () => {
    expect(resolveCookieSecure({ COOKIE_SECURE: "false" })).toBe(false);
  });

  it("refuses to start with an insecure cookie in production", () => {
    expect(() => resolveCookieSecure({ COOKIE_SECURE: "false", NODE_ENV: "production" })).toThrow(
      /not permitted when NODE_ENV=production/,
    );
  });
});

describe("error contract", () => {
  it("answers a thrown session-resolution failure in the JSON error shape", async () => {
    // Stands in for a downed database: `resolveSession` throws rather than
    // returning null. This used to escape as Hono's plain-text "Internal
    // Server Error", bypassing both the error shape and the log redaction.
    const auth = {
      resolveSession() {
        return Promise.reject(new Error("connection terminated unexpectedly"));
      },
    } as unknown as AuthService;

    const app = createApp({ auth, ...schoolDeps(), cookie: { secure: true } });
    const response = await app.request(
      new Request("http://localhost/api/me", {
        headers: { Cookie: "teacherly_session=whatever" },
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: { code: "internal_error" } });
  });

  it("answers an unknown route in the JSON error shape, once authenticated", async () => {
    const app = makeApp();
    const cookie = await sessionCookieFor(app, "explorer@school.test");

    const response = await app.request(
      new Request("http://localhost/api/nope", { headers: { Cookie: cookie } }),
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: { code: "not_found" } });
  });

  it("answers an unknown route to an anonymous caller with 401, not 404", async () => {
    const response = await makeApp().request("http://localhost/api/nope");

    // This changed when chunk 2 mounted the school routes at `/api` behind a
    // single `requireTeacher()` gate: the gate now runs before anything decides
    // whether a path exists, so an anonymous caller is refused rather than told
    // what is and is not a route.
    //
    // Deliberate, and the better of the two: an unauthenticated caller has no
    // business mapping the API surface, and this is the same reasoning as the
    // 404-not-403 rule for another teacher's ids. An authenticated caller still
    // gets the documented 404 contract — see the test above — so the error
    // shape is unchanged for anyone entitled to it.
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { code: "unauthenticated" } });
  });

  it("still serves the public auth routes with no session", async () => {
    // The guard above is mounted at `/api/*`. The auth routes are registered
    // before it and return without calling `next()`, so they are unaffected —
    // asserted here because a reordering in `createApp` would otherwise lock
    // every new teacher out of signing up, and no other test would say why.
    const response = await makeApp().request(signupRequest("public@school.test"));
    expect(response.status).toBe(201);
  });
});

describe("rate limiting", () => {
  // Per-email: 10 attempts per 15 minutes. All from one app instance, so the
  // counter is the one inside `authRoutes`.
  let app: ReturnType<typeof makeApp>;
  beforeEach(() => {
    app = makeApp();
  });

  it("returns 429 in the standard error shape once the email quota is spent", async () => {
    const login = () =>
      app.request(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "guessme@school.test", password: "wrong-password-x" }),
        }),
      );

    const statuses: number[] = [];
    for (let attempt = 0; attempt < 12; attempt += 1) {
      statuses.push((await login()).status);
    }

    // The first ten are ordinary credential failures; the rest are throttled.
    expect(statuses.slice(0, 10)).toEqual(Array<number>(10).fill(401));
    expect(statuses.slice(10)).toEqual([429, 429]);

    const limited = await login();
    expect(await limited.json()).toEqual({ error: { code: "rate_limited" } });
    expect(limited.headers.get("retry-after")).toMatch(/^\d+$/);
  });

  it("counts a normalized address, so casing and padding do not reset it", async () => {
    const login = (email: string) =>
      app.request(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: "wrong-password-x" }),
        }),
      );

    for (let attempt = 0; attempt < 10; attempt += 1) {
      await login("Mixed@School.test");
    }
    // Same address, different spelling: must hit the same counter.
    expect((await login("  mixed@school.TEST  ")).status).toBe(429);
  });
});
