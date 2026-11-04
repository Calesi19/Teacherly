import type { Locale } from "./locale";

declare const teacherIdBrand: unique symbol;

/**
 * The identifier for a teacher-owned workspace. Every repository method that
 * reaches teacher-owned data takes one of these, and `packages/db` is the only
 * place allowed to turn it into a `WHERE` clause.
 *
 * Branded on purpose. A bare `string` alias documented the intent but enforced
 * nothing: `c.req.query("teacherId")` satisfied it exactly as well as a
 * session-resolved id did, so a future route could name someone else's
 * workspace and still typecheck. The brand makes that a compile error.
 *
 * A `TeacherId` is still a `string` at runtime — it serializes, compares and
 * logs normally. The brand exists only to constrain where one can be *created*.
 */
export type TeacherId = string & { readonly [teacherIdBrand]: "TeacherId" };

/**
 * The only way to make a `TeacherId`.
 *
 * Legitimate callers are the places that read an id out of the `teachers`
 * table, and the in-memory test doubles that stand in for them:
 *   - `packages/db/src/schema.ts` types the `id` / `teacher_id` columns as
 *     `TeacherId` with Drizzle's `$type`, so row-to-domain mapping needs no
 *     cast at all and this function is not called there;
 *   - `packages/core/src/testing/fakes.ts` mints ids for the fake repositories.
 *
 * Nothing under `apps/` calls this, and `pnpm check:core-purity` fails the
 * build if an `apps/*` route reaches for it or for an equivalent cast. A
 * request handler therefore cannot invent a `TeacherId`; it can only receive
 * one that a repository already produced.
 */
export function asTeacherId(raw: string): TeacherId {
  return raw as TeacherId;
}

/** The public shape of a teacher. Never carries the password hash. */
export interface Teacher {
  id: TeacherId;
  email: string;
  displayName: string;
  locale: Locale;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A teacher plus the secret needed to authenticate them. Only the auth domain
 * service ever sees this; it is never returned from an HTTP handler.
 */
export interface TeacherCredentials {
  teacher: Teacher;
  passwordHash: string;
}

export interface NewTeacher {
  email: string;
  passwordHash: string;
  displayName: string;
  locale: Locale;
}
