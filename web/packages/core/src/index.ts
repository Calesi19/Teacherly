export { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from "./domain/locale";
export {
  type NewTeacher,
  type Teacher,
  type TeacherCredentials,
  type TeacherId,
} from "./domain/teacher";
export {
  SESSION_ABSOLUTE_TTL_MS,
  computeSessionExpiry,
  isSessionActive,
  type NewSession,
  type Session,
  type SessionId,
} from "./domain/session";
export {
  InvalidCredentialsError,
  SessionOwnershipError,
  ValidationError,
  type ValidationIssue,
} from "./domain/errors";

export { systemClock, type Clock } from "./ports/clock";
export { type PasswordHasher } from "./ports/password-hasher";
export { type SessionTokenService } from "./ports/session-token-service";
export { type TeacherRepository } from "./ports/teacher-repository";
export {
  type RevokeSessionInput,
  type SessionRepository,
  type TouchSessionInput,
} from "./ports/session-repository";

export {
  AuthService,
  type AuthServiceDeps,
  type AuthenticatedTeacher,
  type IssuedSession,
} from "./auth/auth-service";
export {
  MAX_DISPLAY_NAME_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  validateLogin,
  validateSignup,
  type LoginInput,
  type SignupInput,
  type ValidLoginInput,
  type ValidSignupInput,
} from "./auth/validation";
