import { DEFAULT_LOCALE, isLocale, type Locale } from "../domain/locale";
import { ValidationError, type ValidationIssue } from "../domain/errors";

/**
 * Minimum password length. 12 rather than the NIST SP 800-63B floor of 8
 * because this chunk ships no rate limiting and no second factor; the extra
 * length is the only brake on online guessing we have for now.
 */
export const MIN_PASSWORD_LENGTH = 12;

/**
 * Upper bound so a request body cannot turn argon2id into a CPU exhaustion
 * primitive. Well above any real passphrase.
 */
export const MAX_PASSWORD_LENGTH = 1024;

export const MAX_EMAIL_LENGTH = 254;
export const MAX_DISPLAY_NAME_LENGTH = 120;

/** Deliberately permissive: shape only. Deliverability is not our business here. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The one email normalization rule in the system: trim, then lowercase.
 * `packages/db` applies this again at the boundary and the `teachers` table has
 * a `CHECK (email = lower(email))` constraint, so the unique index genuinely
 * enforces case-insensitive uniqueness rather than merely implying it.
 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export interface SignupInput {
  email: string;
  password: string;
  displayName: string;
  locale?: Locale | undefined;
}

export interface ValidSignupInput {
  email: string;
  password: string;
  displayName: string;
  locale: Locale;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ValidLoginInput {
  email: string;
  password: string;
}

function checkEmail(raw: unknown, issues: ValidationIssue[]): string {
  if (typeof raw !== "string") {
    issues.push({ field: "email", code: "required" });
    return "";
  }
  const email = normalizeEmail(raw);
  if (email.length === 0) {
    issues.push({ field: "email", code: "required" });
  } else if (email.length > MAX_EMAIL_LENGTH) {
    issues.push({ field: "email", code: "too_long" });
  } else if (!EMAIL_SHAPE.test(email)) {
    issues.push({ field: "email", code: "invalid_format" });
  }
  return email;
}

function checkPassword(raw: unknown, issues: ValidationIssue[], enforceStrength: boolean): string {
  if (typeof raw !== "string" || raw.length === 0) {
    issues.push({ field: "password", code: "required" });
    return "";
  }
  if (raw.length > MAX_PASSWORD_LENGTH) {
    issues.push({ field: "password", code: "too_long" });
    return raw;
  }
  // On login we only bound the length. Rejecting a short password at login with
  // a *validation* error would leak that no account can have that password,
  // and more importantly gives a different response shape than a wrong guess.
  if (enforceStrength && raw.length < MIN_PASSWORD_LENGTH) {
    issues.push({ field: "password", code: "too_short" });
  }
  return raw;
}

export function validateSignup(input: SignupInput): ValidSignupInput {
  const issues: ValidationIssue[] = [];
  const email = checkEmail(input.email, issues);
  const password = checkPassword(input.password, issues, true);

  const displayName = typeof input.displayName === "string" ? input.displayName.trim() : "";
  if (displayName.length === 0) {
    issues.push({ field: "displayName", code: "required" });
  } else if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    issues.push({ field: "displayName", code: "too_long" });
  }

  let locale: Locale = DEFAULT_LOCALE;
  if (input.locale !== undefined) {
    if (!isLocale(input.locale)) {
      issues.push({ field: "locale", code: "unsupported" });
    } else {
      locale = input.locale;
    }
  }

  if (issues.length > 0) throw new ValidationError(issues);
  return { email, password, displayName, locale };
}

export function validateLogin(input: LoginInput): ValidLoginInput {
  const issues: ValidationIssue[] = [];
  const email = checkEmail(input.email, issues);
  const password = checkPassword(input.password, issues, false);
  if (issues.length > 0) throw new ValidationError(issues);
  return { email, password };
}
