import {
  InvalidCredentialsError,
  normalizeEmail,
  type AuthService,
  type IssuedSession,
  type Locale,
  type Teacher,
} from "@teacherly/core";
import { Hono, type Context } from "hono";

import { clearSessionCookie, setSessionCookie, type CookieOptions } from "../http/cookies";
import { toErrorResponse } from "../http/errors";
import { inviteCodeChecker, type InviteCodeCheck } from "../http/invite-code";
import { pickString, readJson } from "../http/json";
import {
  AUTH_EMAIL_RATE_LIMIT,
  FixedWindowRateLimiter,
  SIGNUP_EMAIL_RATE_LIMIT,
  tooManyRequests,
} from "../http/rate-limit";
import { requireTeacher, type AppEnv } from "../http/session-middleware";

export interface AuthRouteDeps {
  auth: AuthService;
  cookie: CookieOptions;
  /**
   * The shared signup invite code, from `SIGNUP_INVITE_CODE`. Absent disables
   * signup — see `inviteCodeChecker`, which is where the fail-closed decision
   * lives rather than here.
   */
  signupInviteCode?: string | undefined;
}

/** The teacher as the client sees them. No password hash, no session internals. */
interface TeacherResponse {
  id: string;
  email: string;
  displayName: string;
  locale: Locale;
}

function toTeacherResponse(teacher: Teacher): TeacherResponse {
  return {
    id: teacher.id,
    email: teacher.email,
    displayName: teacher.displayName,
    locale: teacher.locale,
  };
}

export function authRoutes(deps: AuthRouteDeps): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  /**
   * Per-address attempt counters, independent of the per-IP one in `createApp`
   * and independent **of each other**.
   *
   * Two buckets, not one, and that is a fix rather than tidiness. They were one
   * `emailLimiter` shared by signup and login, and because signup answers
   * uniformly, an attacker could post signups for a registered teacher's
   * address until the shared bucket was spent — after which the teacher's own
   * correct password got `429`, with `Retry-After` approaching 15 minutes.
   * Roughly 0.7 requests per minute sustains that indefinitely, and this chunk
   * has no password reset, so the teacher has no recovery path at all. A
   * request an attacker can make must not consume an allowance the victim
   * needs.
   */
  const loginLimiter = new FixedWindowRateLimiter(AUTH_EMAIL_RATE_LIMIT);
  const signupLimiter = new FixedWindowRateLimiter(SIGNUP_EMAIL_RATE_LIMIT);

  const checkInviteCode: InviteCodeCheck = inviteCodeChecker(deps.signupInviteCode);

  /** 429 before any argon2 work happens, or `null` to proceed. */
  function emailQuota(
    c: Context<AppEnv>,
    limiter: FixedWindowRateLimiter,
    rawEmail: string,
  ): Response | null {
    const key = normalizeEmail(rawEmail);
    if (key.length === 0) return null; // validation will reject it anyway
    if (limiter.consume(key)) return null;
    return tooManyRequests(c, limiter.retryAfterSeconds(key));
  }

  /**
   * Signup's one and only success-shaped answer.
   *
   * No `Set-Cookie`. That is the point: it is returned for a real registration,
   * for an address that was already taken, and for a wrong or missing invite
   * code, so all three are identical in status, body **and header names**. The
   * cookie was the last thing that distinguished them — status and body were
   * already uniform, and a prober could still tell a free address from a taken
   * one by whether a session came back.
   *
   * The cost is that signing up no longer signs you in. The client posts
   * signup and then posts login with the same credentials, which is one extra
   * round trip and no extra state.
   */
  function signupAccepted(c: Context<AppEnv>): Response {
    return c.json({ ok: true }, 201);
  }

  /**
   * `POST /api/auth/signup` — invite-only, and uniform in its answers.
   *
   * What the responses are, and why:
   *
   *   - `503 {"error":{"code":"signup_disabled"}}` when `SIGNUP_INVITE_CODE` is
   *     unset. Fail closed: an unconfigured deployment registers nobody rather
   *     than registering anybody. This is a property of the deployment, not of
   *     the request, so answering it plainly tells an attacker nothing they
   *     could not learn by trying once.
   *   - `201 {"ok":true}`, no cookie, for every other outcome: registered,
   *     address already taken, wrong code, missing code. One response, so
   *     there is nothing to compare.
   *   - `400` for a malformed request, which is about the request itself and
   *     carries no existence signal, and `429` when an allowance is spent.
   *
   * What this closes. Signup answering `201` for a free address and `401` for a
   * taken one was a single-request account-existence oracle; making the
   * response uniform left two signals behind — the cookie, closed above, and
   * the fact that probing an address *registers* it, a durable denial of
   * registration against a real teacher. The invite code closes the second by
   * removing "anybody" from "anybody can perform this write". It does not make
   * squatting impossible for someone holding the code; everyone invited holds
   * the same string.
   *
   * What is still measurable, stated rather than claimed closed:
   *   - a rejected invite code answers *faster* than an accepted one, because
   *     an accepted one goes on to hash a password. That separates "my code is
   *     wrong" from "my code is right", which is not an account oracle: it says
   *     nothing about any address. Taken-versus-free remains unmeasurable
   *     because `AuthService.signup` hashes before it looks the address up.
   *   - someone holding the code can still learn whether an address was free
   *     by following up with `POST /api/auth/login`, exactly as before.
   *
   * Reopening signup to the public needs proof of address control — email
   * verification, and password reset with it, since both need the same
   * provider. Both are out of scope for this chunk and are the prerequisite,
   * not an oversight.
   */
  app.post("/signup", async (c) => {
    const body = await readJson(c);
    if (body instanceof Response) return body;

    const verdict = checkInviteCode(pickString(body, "inviteCode"));
    if (verdict === "disabled") {
      return c.json({ error: { code: "signup_disabled" } }, 503);
    }
    if (verdict === "rejected") {
      // Deliberately the same response a taken address gets, and taken before
      // the rate-limit counter is touched so that a codeless caller cannot
      // spend a real teacher's signup allowance either.
      return signupAccepted(c);
    }

    const email = pickString(body, "email");
    const limited = emailQuota(c, signupLimiter, email);
    if (limited !== null) return limited;

    try {
      await deps.auth.signup({
        email,
        password: pickString(body, "password"),
        displayName: pickString(body, "displayName"),
        // Left undefined when absent so core applies its own default locale.
        locale: typeof body["locale"] === "string" ? (body["locale"] as Locale) : undefined,
      });
    } catch (error) {
      // An already-registered address raises InvalidCredentialsError, and must
      // fall through to the same 201 below. A ValidationError is about the
      // request itself, carries no existence signal, and is still reported.
      if (!(error instanceof InvalidCredentialsError)) return toErrorResponse(c, error);
    }

    return signupAccepted(c);
  });

  app.post("/login", async (c) => {
    const body = await readJson(c);
    if (body instanceof Response) return body;

    const email = pickString(body, "email");
    const limited = emailQuota(c, loginLimiter, email);
    if (limited !== null) return limited;

    try {
      const issued = await deps.auth.login({
        email,
        password: pickString(body, "password"),
      });
      return respondWithSession(c, issued, deps.cookie, 200);
    } catch (error) {
      return toErrorResponse(c, error);
    }
  });

  // Logout requires a resolved session, so the revocation is always scoped to
  // the teacher the cookie actually belongs to.
  app.post("/logout", requireTeacher(), async (c) => {
    const token = c.get("sessionToken");
    const teacherId = c.get("teacherId");
    try {
      if (token !== undefined && teacherId !== undefined) {
        await deps.auth.logout(token, teacherId);
      }
      // Clear the cookie only after the server-side revocation succeeded.
      clearSessionCookie(c, deps.cookie);
      return c.body(null, 204);
    } catch (error) {
      return toErrorResponse(c, error);
    }
  });

  return app;
}

/** `GET /api/me` — mounted separately because it is not under `/api/auth`. */
export function meRoute(): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.get("/", requireTeacher(), (c) => {
    const teacher = c.get("teacher");
    if (teacher === undefined) {
      // Unreachable behind requireTeacher; narrows the Partial for TypeScript.
      return c.json({ error: { code: "unauthenticated" } }, 401);
    }
    return c.json({ teacher: toTeacherResponse(teacher) });
  });

  return app;
}

/** Login only — it is the one route that establishes a session. */
function respondWithSession(
  c: Context<AppEnv>,
  issued: IssuedSession,
  cookie: CookieOptions,
  status: 200,
): Response {
  setSessionCookie(c, issued.token, issued.expiresAt, cookie);
  return c.json({ teacher: toTeacherResponse(issued.teacher) }, status);
}
