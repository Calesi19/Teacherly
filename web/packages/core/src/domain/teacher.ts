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
 * The only *named* way to make a `TeacherId`.
 *
 * Legitimate callers are the places that read an id out of the `teachers`
 * table, and the in-memory test doubles that stand in for them:
 *   - `packages/db/src/schema.ts` types the `id` / `teacher_id` columns as
 *     `TeacherId` with Drizzle's `$type`, so row-to-domain mapping needs no
 *     cast at all and this function is not called there;
 *   - `packages/core/src/testing/fakes.ts` mints ids for the fake repositories.
 *
 * ## What is actually enforced
 *
 * A brand cannot enforce this on its own — a cast always exists — so the rule
 * is a textual one in `pnpm check:core-purity`, over every `packages/*​/src` and
 * `apps/*​/src` file outside `packages/db`, the core test fakes and this file.
 * It rejects four spellings: `asTeacherId(...)`, `as TeacherId`,
 * `as unknown as TeacherId` and the angle-bracket `<TeacherId>x` assertion,
 * which is the same operation in older syntax and used to pass.
 *
 * The brand and that scan together cover casts. They do **not** cover `any`,
 * which satisfies any type with no cast to find: `const body = await
 * c.req.json()` is typed `any`, so `const victim: TeacherId = body.teacherId`
 * compiled with nothing for a reviewer or a grep to notice. That is closed
 * separately, by the guardrail also rejecting a direct `c.req.json()` outside
 * `apps/server/src/http/json.ts` — whose `readJson` returns
 * `Record<string, unknown>`, making every field `unknown` and the assignment
 * above a type error. The three controls are the claim; any one of them alone
 * is not.
 *
 * ## The one boundary that stays unbranded, on purpose
 *
 * `TeacherRepository.findCredentialsByEmail(email: string)` takes a plain
 * string, and must: login is handed an address by an anonymous caller and its
 * whole job is to find out whether it belongs to anybody. There is no id to
 * brand yet, and that is the point — the branded id is what comes *back*. The
 * invariant is therefore "a handler cannot name a workspace", not "no
 * untrusted string reaches a repository": lookup by credential is a different
 * operation from access by id, and only the latter is branded.
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
