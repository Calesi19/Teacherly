import type { Locale } from "./locale";

/**
 * The identifier for a teacher-owned workspace. Every repository method that
 * reaches teacher-owned data takes one of these, and `packages/db` is the only
 * place allowed to turn it into a `WHERE` clause.
 */
export type TeacherId = string;

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
