import type { AuthService, IssuedSession, Locale, Teacher } from "@teacherly/core";
import { Hono, type Context } from "hono";

import { clearSessionCookie, setSessionCookie, type CookieOptions } from "../http/cookies";
import { toErrorResponse } from "../http/errors";
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

/** Read an untrusted JSON body without letting a malformed one throw a 500. */
async function readJson(c: Context<AppEnv>): Promise<Record<string, unknown>> {
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

  app.post("/signup", async (c) => {
    const body = await readJson(c);
    try {
      const issued = await deps.auth.signup({
        email: pickString(body, "email"),
        password: pickString(body, "password"),
        displayName: pickString(body, "displayName"),
        // Left undefined when absent so core applies its own default locale.
        locale: typeof body["locale"] === "string" ? (body["locale"] as Locale) : undefined,
      });
      return respondWithSession(c, issued, deps.cookie, 201);
    } catch (error) {
      return toErrorResponse(c, error);
    }
  });

  app.post("/login", async (c) => {
    const body = await readJson(c);
    try {
      const issued = await deps.auth.login({
        email: pickString(body, "email"),
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

function respondWithSession(
  c: Context<AppEnv>,
  issued: IssuedSession,
  cookie: CookieOptions,
  status: 200 | 201,
): Response {
  setSessionCookie(c, issued.token, issued.expiresAt, cookie);
  return c.json({ teacher: toTeacherResponse(issued.teacher) }, status);
}
