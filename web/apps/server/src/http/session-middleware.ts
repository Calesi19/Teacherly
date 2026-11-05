import type { AuthService, Session, Teacher, TeacherId } from "@teacherly/core";
import type { MiddlewareHandler } from "hono";

import { readSessionCookie } from "./cookies";
import { toErrorResponse, unauthorized } from "./errors";

/**
 * The request-scoped facts the rest of the API is allowed to read. There is no
 * variable here for "the teacher id from the request body" or "from the query
 * string" — `teacherId` is only ever written by `sessionMiddleware`, from a
 * cookie token that resolved against the sessions table. That is the single
 * place a teacher is named, and the reason no route handler has to be trusted
 * to scope its own reads.
 */
export interface AppVariables {
  teacher: Teacher;
  teacherId: TeacherId;
  session: Session;
  sessionToken: string;
}

export interface AppEnv {
  Variables: Partial<AppVariables>;
}

/** Env for handlers mounted behind `requireTeacher`, where the vars are set. */
export interface AuthedEnv {
  Variables: AppVariables;
}

/**
 * Resolve the session once per request. Runs on every `/api` route, including
 * the public ones, so that a handler never has to decide whether resolution
 * has happened — it either finds the variables set or it does not.
 */
export function sessionMiddleware(auth: AuthService): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const token = readSessionCookie(c);
    if (token !== undefined && token.length > 0) {
      // `resolveSession` talks to the database, so it can throw for reasons
      // that have nothing to do with the cookie — a downed database, a pool
      // timeout. Letting that escape returned Hono's plain-text "Internal
      // Server Error" instead of this chunk's `{"error":{"code":...}}` shape,
      // and bypassed the redaction in `toErrorResponse`. Route it through the
      // same error contract as everything else.
      //
      // `teacherId` is *not* set on this path: an unresolvable session is an
      // anonymous request, and `requireTeacher` turns that into a 401.
      try {
        const resolved = await auth.resolveSession(token);
        if (resolved !== null) {
          c.set("teacher", resolved.teacher);
          c.set("teacherId", resolved.teacher.id);
          c.set("session", resolved.session);
          c.set("sessionToken", token);
        }
      } catch (error) {
        return toErrorResponse(c, error);
      }
    }
    await next();
  };
}

/** Gate for anything teacher-owned. Downstream, `teacherId` is always present. */
export function requireTeacher(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    if (c.get("teacherId") === undefined) return unauthorized(c);
    await next();
  };
}
