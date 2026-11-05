export interface ValidationIssue {
  field: string;
  code: string;
}

/**
 * The single failure the auth surface is allowed to report for anything
 * credential-shaped. Signup-with-an-existing-email, login-with-an-unknown-email
 * and login-with-a-wrong-password all raise this same error so that no caller
 * can use the response to discover whether an address has an account.
 */
export class InvalidCredentialsError extends Error {
  readonly code = "invalid_credentials" as const;

  constructor() {
    super("Email or password is not valid.");
    this.name = "InvalidCredentialsError";
  }
}

/** Input that failed shape checks. Safe to report precisely — it describes the request, not the stored data. */
export class ValidationError extends Error {
  readonly code = "validation_failed" as const;
  readonly issues: readonly ValidationIssue[];

  constructor(issues: readonly ValidationIssue[]) {
    super("Request input is not valid.");
    this.name = "ValidationError";
    this.issues = issues;
  }
}

/**
 * The record is not in this teacher's workspace.
 *
 * Raised for "no such class" and for "that class belongs to another teacher"
 * alike, and it must stay that way. Answering 403 for the second would tell a
 * caller that an id they guessed is real and someone else's, which is a
 * workspace-enumeration oracle of exactly the kind
 * `InvalidCredentialsError` exists to deny on the auth surface. The repository
 * makes this the easy path as well as the right one: a scoped read returns no
 * row in both cases, so the two are not distinguishable here either.
 *
 * `kind` names the table for the API's error code (`class_not_found`), which is
 * safe — the caller already knows which endpoint they called.
 */
export class NotFoundError extends Error {
  readonly code: string;

  constructor(readonly kind: "class" | "student" | "assessment" | "grade") {
    super(`No ${kind} with that id in this workspace.`);
    this.name = "NotFoundError";
    this.code = `${kind}_not_found`;
  }
}

/** Raised when a resolved session does not belong to the teacher the caller named. */
export class SessionOwnershipError extends Error {
  readonly code = "session_ownership" as const;

  constructor() {
    super("Session does not belong to the given teacher.");
    this.name = "SessionOwnershipError";
  }
}
