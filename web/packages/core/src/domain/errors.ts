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

/** Raised when a resolved session does not belong to the teacher the caller named. */
export class SessionOwnershipError extends Error {
  readonly code = "session_ownership" as const;

  constructor() {
    super("Session does not belong to the given teacher.");
    this.name = "SessionOwnershipError";
  }
}
