import { MIN_PASSWORD_LENGTH } from "@teacherly/core";
import { interpolate, type Translations } from "@teacherly/i18n";

import { ApiError, type ApiIssue } from "../api/client";

/**
 * Turn the server's machine-readable failure into translated text. The server
 * sends codes, never prose, so both languages get the same information and
 * neither leaks more than the other.
 */
export function describeApiError(error: unknown, t: Translations): string {
  if (!(error instanceof ApiError)) return t.auth.errorUnexpected;

  if (error.code === "invalid_credentials") return t.auth.errorInvalidCredentials;

  // The auth rate limiter. Only reachable on the sign-in form in practice,
  // since sign-up's 429 is one of the failures that does surface as isError.
  if (error.code === "rate_limited") return t.auth.errorRateLimited;

  // The server has no SIGNUP_INVITE_CODE, so it registers nobody.
  if (error.code === "signup_disabled") return t.auth.errorSignupDisabled;

  if (error.code === "validation_failed") {
    const first = error.issues[0];
    if (first !== undefined) return describeIssue(first, t);
  }

  return t.auth.errorUnexpected;
}

function describeIssue(issue: ApiIssue, t: Translations): string {
  const key = `${issue.field}:${issue.code}`;
  switch (key) {
    case "email:required":
      return t.auth.errorEmailRequired;
    case "email:invalid_format":
      return t.auth.errorEmailFormat;
    case "email:too_long":
      return t.auth.errorEmailTooLong;
    case "password:required":
      return t.auth.errorPasswordRequired;
    case "password:too_short":
      return interpolate(t.auth.errorPasswordTooShort, { min: MIN_PASSWORD_LENGTH });
    case "password:too_long":
      return t.auth.errorPasswordTooLong;
    case "displayName:required":
      return t.auth.errorDisplayNameRequired;
    case "displayName:too_long":
      return t.auth.errorDisplayNameTooLong;
    case "locale:unsupported":
      return t.auth.errorLocaleUnsupported;
    default:
      return t.auth.errorUnexpected;
  }
}
