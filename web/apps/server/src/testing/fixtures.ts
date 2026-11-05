import { AuthService, GradebookService, SchoolService } from "@teacherly/core";
import {
  FakePasswordHasher,
  FakeSessionTokenService,
  InMemorySessionRepository,
  InMemoryTeacherRepository,
  MutableClock,
  SchoolStore,
  createSchoolFakes,
} from "@teacherly/core/testing";

import { createApp, type AppDeps } from "../app";

/**
 * The shared fixture for route-level tests: a real `createApp` over in-memory
 * repositories, with no Postgres and no argon2.
 *
 * It builds the app the same way `container.ts` does — the same `AuthService`,
 * `SchoolService` and `GradebookService` classes, wired to fakes instead of
 * Drizzle. That is what makes a test here meaningful: the request goes through
 * the real session middleware, the real `requireTeacher` gate, the real
 * handlers and the real services, and only the SQL is substituted.
 *
 * Signing a teacher up through `POST /api/auth/signup` — and then logging in
 * through `POST /api/auth/login`, since sign-up deliberately issues no session
 * — rather than inserting a row is deliberate. The session cookie a test then
 * carries is one the app actually issued, so "teacher A cannot read teacher
 * B's class" is being decided by the same path that decides it in production,
 * not by a hand-made token.
 */

export const TEST_PASSWORD = "correct-horse-battery";
const DECOY_HASH = "fake$a-value-nobody-knows";

/**
 * The invite code these fixtures configure their app with. Sign-up is
 * invite-only and fails closed, so an app built without one refuses every
 * sign-up — see `inviteCodeChecker`.
 */
const TEST_INVITE_CODE = "fixture-invite-code";

export interface Fixture {
  app: ReturnType<typeof createApp>;
  store: SchoolStore;
}

/** A fresh app with an empty workspace. */
export function makeFixture(overrides: Partial<AppDeps> = {}): Fixture {
  const auth = new AuthService({
    teachers: new InMemoryTeacherRepository(),
    sessions: new InMemorySessionRepository(),
    passwordHasher: new FakePasswordHasher(),
    sessionTokens: new FakeSessionTokenService(),
    clock: new MutableClock(new Date("2026-01-15T09:00:00.000Z")),
    decoyPasswordHash: DECOY_HASH,
  });

  const store = new SchoolStore();
  const repositories = createSchoolFakes(store);

  const app = createApp({
    auth,
    school: new SchoolService(repositories),
    gradebook: new GradebookService(repositories),
    cookie: { secure: false },
    signupInviteCode: TEST_INVITE_CODE,
    ...overrides,
  });

  return { app, store };
}

/**
 * Sign a teacher up, log them in, and return the session cookie.
 *
 * The cookie is the only credential a test ever holds. There is no way to ask
 * the fixture for "teacher B's id" and pass it to a route, which is the point:
 * the isolation tests have to go through the same door a browser does.
 *
 * Two requests rather than one because sign-up issues no session: its response
 * is identical for a real sign-up, an address that was already taken and a
 * wrong invite code, so a `Set-Cookie` on only the first of those would be an
 * account-existence oracle. Login is the only route that establishes a
 * session, which is exactly what the real client does too.
 */
export async function signUp(fixture: Fixture, email: string): Promise<string> {
  const signup = await fixture.app.request(
    new Request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: TEST_PASSWORD,
        displayName: "A Teacher",
        inviteCode: TEST_INVITE_CODE,
      }),
    }),
  );
  if (signup.status !== 201) {
    throw new Error(`signup for ${email} failed with ${signup.status}`);
  }

  const login = await fixture.app.request(
    new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: TEST_PASSWORD }),
    }),
  );
  // A 401 here means the sign-up above did not actually register anyone — a
  // taken address or a rejected code, both of which answer 201 — so it is
  // worth distinguishing from "no cookie".
  if (login.status !== 200) {
    throw new Error(`login for ${email} failed with ${login.status}`);
  }

  const setCookie = login.headers.get("set-cookie");
  if (setCookie === null) throw new Error(`login for ${email} issued no session cookie`);
  const cookie = setCookie.split(";")[0];
  if (cookie === undefined || !cookie.startsWith("teacherly_session=")) {
    throw new Error(`unexpected session cookie: ${setCookie}`);
  }
  return cookie;
}

/** An authenticated JSON request. `cookie` is what `signUp` returned. */
export function authed(
  cookie: string,
  method: string,
  path: string,
  body?: unknown,
): Request {
  const headers: Record<string, string> = { Cookie: cookie };
  // Only set a JSON content type when there is a body: `readJson` requires one
  // for writes, and a GET that declared one would be testing a shape no client
  // sends.
  if (body !== undefined) headers["Content-Type"] = "application/json";

  return new Request(`http://localhost${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
