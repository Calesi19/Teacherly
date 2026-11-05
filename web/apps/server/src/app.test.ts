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
import { resolveCookieSecure, resolveSignupInviteCode } from "./config";

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
const INVITE_CODE = "staff-room-2026";

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
  return createApp({
    auth,
    ...schoolDeps(),
    cookie: { secure: false },
    signupInviteCode: INVITE_CODE,
    ...overrides,
  });
}

/**
 * Sign a teacher up, then log in, and return the session cookie.
 *
 * Two requests because signup deliberately issues none: its response is
 * identical for a real signup, a taken address and a wrong invite code, and a
 * `Set-Cookie` on only the first of those was the signal that made it an
 * account-existence oracle. Login is the only route that establishes a
 * session.
 */
async function sessionCookieFor(
  app: ReturnType<typeof makeApp>,
  email: string,
): Promise<string> {
  await app.request(signupRequest(email));
  const response = await app.request(loginRequest(email));
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  if (cookie === undefined) throw new Error(`login for ${email} issued no cookie`);
  return cookie;
}

/** A well-formed signup, as the real client sends it. */
function signupRequest(email: string, inviteCode: string | undefined = INVITE_CODE): Request {
  return new Request("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password: PASSWORD,
      displayName: "A Teacher",
      ...(inviteCode === undefined ? {} : { inviteCode }),
    }),
  });
}

/** Signup no longer signs anyone in, so a test that needs a cookie logs in. */
function loginRequest(email: string, password = PASSWORD): Request {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

/** Status, body and the *set* of header names — the three things CAL-9 compared. */
async function fingerprint(response: Response) {
  return {
    status: response.status,
    body: await response.text(),
    headers: [...response.headers.keys()].sort(),
  };
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
    // Status, body byte for byte, and the whole set of header names — not
    // just the content type, because the signal that outlived the first fix
    // was a `Set-Cookie` that only the free address got.
    expect(await fingerprint(taken)).toEqual(await fingerprint(free));
    expect(taken.status).toBe(201);
  });

  it("issues no session at all, so the cookie cannot be compared either", async () => {
    const app = makeApp();
    await app.request(signupRequest("first@school.test"));

    const free = await app.request(signupRequest("second@school.test"));
    const taken = await app.request(signupRequest("first@school.test"));

    // The last signal, closed. It used to set the cookie for a real signup
    // and not for a taken address, so a prober read the answer off whether a
    // session came back. Now nobody gets one and the teacher logs in after.
    expect(free.headers.get("set-cookie")).toBeNull();
    expect(taken.headers.get("set-cookie")).toBeNull();
  });

  it("leaves a real signup able to log in, which is how the client proceeds", async () => {
    const app = makeApp();
    await app.request(signupRequest("real@school.test"));

    const login = await app.request(loginRequest("real@school.test"));

    expect(login.status).toBe(200);
    expect(login.headers.get("set-cookie")).toContain("teacherly_session=");
  });

  it("still reports a validation failure, which carries no existence signal", async () => {
    const app = makeApp();
    const response = await app.request(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "not-an-email",
          password: "x",
          displayName: "",
          inviteCode: INVITE_CODE,
        }),
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "validation_failed" } });
  });
});

describe("POST /api/auth/signup — invite-only", () => {
  it("registers a teacher when the code is right", async () => {
    const app = makeApp();

    expect((await app.request(signupRequest("invited@school.test"))).status).toBe(201);
    // The account exists, which is the only observable difference and is only
    // observable to someone who knows the password.
    expect((await app.request(loginRequest("invited@school.test"))).status).toBe(200);
  });

  it("answers a wrong code, a missing code and a taken address identically", async () => {
    const app = makeApp();
    await app.request(signupRequest("taken@school.test"));

    const takenAddress = await app.request(signupRequest("taken@school.test"));
    const wrongCode = await app.request(signupRequest("free1@school.test", "not-the-code"));
    const missingCode = await app.request(signupRequest("free2@school.test", undefined));
    const emptyCode = await app.request(signupRequest("free3@school.test", ""));

    // Same status, same body, same header names. A caller comparing responses
    // learns neither whether the address was free nor whether their code was
    // right, and the two cases are not distinguishable from each other.
    const expected = await fingerprint(takenAddress);
    expect(await fingerprint(wrongCode)).toEqual(expected);
    expect(await fingerprint(missingCode)).toEqual(expected);
    expect(await fingerprint(emptyCode)).toEqual(expected);
    expect(expected.status).toBe(201);
  });

  it("registers nobody when the code was wrong", async () => {
    const app = makeApp();
    await app.request(signupRequest("nope@school.test", "not-the-code"));

    // The 201 above was a uniform answer, not a signup: the address is still
    // unregistered, so a codeless caller cannot squat it.
    expect((await app.request(loginRequest("nope@school.test"))).status).toBe(401);
  });

  it("refuses signup outright when no code is configured", async () => {
    const app = makeApp({ signupInviteCode: undefined });

    const response = await app.request(signupRequest("anyone@school.test", undefined));

    // Fail closed. An unconfigured deployment registers nobody rather than
    // falling back to open signup.
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: { code: "signup_disabled" } });
    expect((await app.request(loginRequest("anyone@school.test"))).status).toBe(401);
  });

  it("refuses signup when the configured code is blank", async () => {
    // The `SIGNUP_INVITE_CODE=` line somebody leaves in a .env. It must not
    // become "a code that an empty inviteCode field matches".
    expect(resolveSignupInviteCode({ SIGNUP_INVITE_CODE: "   " })).toBeUndefined();
    expect(resolveSignupInviteCode({})).toBeUndefined();
    expect(resolveSignupInviteCode({ SIGNUP_INVITE_CODE: " abc " })).toBe("abc");

    const app = makeApp({ signupInviteCode: "  " });
    expect((await app.request(signupRequest("blank@school.test", "  "))).status).toBe(503);
  });

  it("checks the code before the rate-limit counter is touched", async () => {
    const app = makeApp();

    // A codeless caller, far past the per-address signup allowance of 10.
    for (let attempt = 0; attempt < 15; attempt += 1) {
      const response = await app.request(signupRequest("victim@school.test", "wrong"));
      // Never a 429: a request that was refused the gate must not spend the
      // allowance of the address it named, or rejecting the code would itself
      // become a way to deny somebody their signup.
      expect(response.status).toBe(201);
    }

    // And the address is still signupable by someone holding the code.
    expect((await app.request(signupRequest("victim@school.test"))).status).toBe(201);
    expect((await app.request(loginRequest("victim@school.test"))).status).toBe(200);
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
  // Driven through login rather than signup: login is now the only route that
  // issues a session cookie at all.
  async function cookieFrom(app: ReturnType<typeof makeApp>, email: string) {
    await app.request(signupRequest(email));
    const response = await app.request(loginRequest(email));
    return response.headers.get("set-cookie");
  }

  it("emits Secure when createApp is given secure cookies", async () => {
    const app = makeApp({ cookie: { secure: true } });
    expect(await cookieFrom(app, "secure@school.test")).toContain("Secure");
  });

  it("omits Secure only when explicitly asked to", async () => {
    const app = makeApp({ cookie: { secure: false } });
    expect(await cookieFrom(app, "insecure@school.test")).not.toContain("Secure");
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

  it("does not let signups spend a registered teacher's login allowance", async () => {
    // CAL-9 NEW-3, reproduced. Signup and login shared one per-address
    // counter, and signup answers uniformly, so an attacker holding the
    // invite code could post signups for a real teacher's address until the
    // shared bucket was spent — after which the teacher's own correct
    // password got 429 with Retry-After approaching 15 minutes. About 0.7
    // requests a minute sustains that forever, and this chunk has no password
    // reset, so there was no recovery path.
    await app.request(signupRequest("teacher@school.test"));

    for (let attempt = 0; attempt < 15; attempt += 1) {
      await app.request(signupRequest("teacher@school.test"));
    }

    const login = await app.request(loginRequest("teacher@school.test"));
    expect(login.status).toBe(200);
  });

  it("still limits signup itself, in its own bucket", async () => {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 12; attempt += 1) {
      statuses.push((await app.request(signupRequest("flood@school.test"))).status);
    }

    // Separate buckets, not an absent limit: the first ten are the uniform
    // 201 and the rest are throttled.
    expect(statuses.slice(0, 10)).toEqual(Array<number>(10).fill(201));
    expect(statuses.slice(10)).toEqual([429, 429]);

    // And the login bucket for that address is untouched.
    expect((await app.request(loginRequest("flood@school.test"))).status).toBe(200);
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
