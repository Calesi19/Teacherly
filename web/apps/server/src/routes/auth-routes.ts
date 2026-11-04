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
import {
  AUTH_EMAIL_RATE_LIMIT,
  FixedWindowRateLimiter,
  tooManyRequests,
} from "../http/rate-limit";
import { requireTeacher, type AppEnv } from "../http/session-middleware";

export interface AuthRouteDeps {
  auth: AuthService;
  cookie: CookieOptions;
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

/**
 * Read an untrusted JSON body without letting a malformed one throw a 500, and
 * refuse the request outright when it is not one a browser on this origin
 * could have made. Returns a `Response` in that case; callers must return it.
 *
 * Both guards live here, in the shared reader, so every route added later
 * inherits them rather than having to remember them.
 *
 * The attack this closes: `c.req.json()` is `JSON.parse(await text())` with no
 * `Content-Type` check, so a cross-site `<form enctype="text/plain">` POST
 * reached `/api/auth/login` with no CORS preflight and got back a `200` and a
 * `Set-Cookie`. `SameSite` governs when a cookie is *sent*, not whether it may
 * be *set*, so a teacher who merely loaded an attacker's page had the
 * attacker's session installed for `/api` — and every grade and note they then
 * wrote would have landed in the attacker's workspace.
 */
async function readJson(c: Context<AppEnv>): Promise<Record<string, unknown> | Response> {
  // 1. A JSON content type cannot be produced by a simple cross-site form
  //    post, so requiring it reinstates the CORS preflight as a gate.
  const contentType = c.req.header("content-type")?.trim().toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return c.json({ error: { code: "unsupported_media_type" } }, 415);
  }

  // 2. Belt and braces for browsers that send it: `Sec-Fetch-Site` is set by
  //    the browser and cannot be forged by page script. Absent on non-browser
  //    clients (curl, the Playwright API context), so those still work.
  const site = c.req.header("sec-fetch-site");
  if (site !== undefined && site !== "same-origin" && site !== "none") {
    return c.json({ error: { code: "cross_site_request_blocked" } }, 403);
  }

  try {
    const body = await c.req.json();
    return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * Unknown fields are dropped rather than forwarded. The domain service does the
 * real validation; this only stops arbitrary JSON reaching it. Values stay
 * `unknown`-ish on purpose — `validateSignup` is the one place that decides
 * what a valid email or password is.
 */
function pickString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === "string" ? value : "";
}

export function authRoutes(deps: AuthRouteDeps): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  // Per-address attempt counter, independent of the per-IP one in `createApp`.
  // Bounds guessing against a single account even when the attempts come from
  // many source addresses.
  const emailLimiter = new FixedWindowRateLimiter(AUTH_EMAIL_RATE_LIMIT);

  /** 429 before any argon2 work happens, or `null` to proceed. */
  function emailQuota(c: Context<AppEnv>, rawEmail: string): Response | null {
    const key = normalizeEmail(rawEmail);
    if (key.length === 0) return null; // validation will reject it anyway
    if (emailLimiter.consume(key)) return null;
    return tooManyRequests(c, emailLimiter.retryAfterSeconds(key));
  }

  /**
   * Signup answers identically whether or not the address was already taken:
   * `201 {"ok":true}`, same status, same body, same headers apart from the
   * session cookie. Previously a new address got `201` and a registered one
   * got `401`, which made the status code a free account-existence oracle —
   * one unauthenticated request per address, no credentials needed.
   *
   * The client learns who it is from `GET /api/me` rather than from this
   * response, which is why the body no longer carries the teacher.
   *
   * OPEN PRODUCT DECISION — not an oversight. Two things are still true and
   * are deliberately left alone here:
   *   1. probing an address *registers* it, which is a durable denial of
   *      registration against a real teacher (squatting);
   *   2. a prober who follows up with `POST /api/auth/login` still learns
   *      whether the address was free, because their own signup would have
   *      succeeded.
   * Closing either needs proof of address control — email verification or
   * invite codes — which is a product decision the user is answering
   * separately. Do not treat the remaining signal as missed.
   */
  app.post("/signup", async (c) => {
    const body = await readJson(c);
    if (body instanceof Response) return body;

    const email = pickString(body, "email");
    const limited = emailQuota(c, email);
    if (limited !== null) return limited;

    try {
      const issued = await deps.auth.signup({
        email,
        password: pickString(body, "password"),
        displayName: pickString(body, "displayName"),
        // Left undefined when absent so core applies its own default locale.
        locale: typeof body["locale"] === "string" ? (body["locale"] as Locale) : undefined,
      });
      setSessionCookie(c, issued.token, issued.expiresAt, deps.cookie);
    } catch (error) {
      // An already-registered address raises InvalidCredentialsError, and must
      // fall through to the same 201 below. A ValidationError is about the
      // request itself, carries no existence signal, and is still reported.
      if (!(error instanceof InvalidCredentialsError)) return toErrorResponse(c, error);
    }

    return c.json({ ok: true }, 201);
  });

  app.post("/login", async (c) => {
    const body = await readJson(c);
    if (body instanceof Response) return body;

    const email = pickString(body, "email");
    const limited = emailQuota(c, email);
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

/** Login only. Signup no longer returns the teacher — see the note on it. */
function respondWithSession(
  c: Context<AppEnv>,
  issued: IssuedSession,
  cookie: CookieOptions,
  status: 200,
): Response {
  setSessionCookie(c, issued.token, issued.expiresAt, cookie);
  return c.json({ teacher: toTeacherResponse(issued.teacher) }, status);
}
