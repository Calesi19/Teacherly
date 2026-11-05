export { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from "./domain/locale";
export {
  asTeacherId,
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
  NotFoundError,
  SessionOwnershipError,
  ValidationError,
  type ValidationIssue,
} from "./domain/errors";
export {
  type Assessment,
  type AssessmentId,
  type AssessmentUpdate,
  type Class,
  type ClassId,
  type ClassUpdate,
  type Grade,
  type GradeEntry,
  type NewAssessment,
  type NewClass,
  type NewStudent,
  type Student,
  type StudentId,
  type StudentUpdate,
} from "./domain/school";

/**
 * The grading module. The only exported way to obtain a percentage, a letter or
 * a rounded number anywhere in Teacherly — see `packages/core/src/grading`.
 */
export {
  CUTOFF_LETTERS,
  DEFAULT_GRADING_SCALE,
  LETTERS,
  PERCENTAGE_DECIMALS,
  averageForAssessment,
  createGradingScale,
  gradeAssessmentForStudent,
  gradeClassForStudent,
  gradeClassForStudents,
  isExactScore,
  letterFor,
  percentageOf,
  reportForAssessment,
  type AssessmentAverage,
  type AssessmentReport,
  type AssessmentResult,
  type CutoffLetter,
  type GradableAssessment,
  type GradableGrade,
  type GradeStatus,
  type GradeTotals,
  type GradingScale,
  type GradingScaleInput,
  type Letter,
  type StudentClassGrade,
} from "./grading";

export { systemClock, type Clock } from "./ports/clock";
export { type PasswordHasher } from "./ports/password-hasher";
export { type SessionTokenService } from "./ports/session-token-service";
export { type TeacherRepository } from "./ports/teacher-repository";
export {
  type AssessmentRepository,
  type ClassRepository,
  type GradeRepository,
  type StudentRepository,
} from "./ports/school-repository";
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
export {
  MAX_COURSE_NAME_LENGTH,
  MAX_NAME_LENGTH,
  MAX_SCORE_LIMIT,
  MAX_STUDENT_NUMBER_LENGTH,
  validateAssessmentUpdate,
  validateClassUpdate,
  validateGradeEntry,
  validateNewAssessment,
  validateNewClass,
  validateNewStudent,
  validateStudentUpdate,
} from "./school/validation";
export {
  SchoolService,
  type SchoolServiceDeps,
} from "./school/school-service";
export {
  GradebookService,
  type AssessmentGradebook,
  type ClassGradebook,
  type GradebookServiceDeps,
} from "./school/gradebook-service";
