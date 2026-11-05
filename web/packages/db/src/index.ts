export { createDatabase, type Database, type DatabaseHandle } from "./client";
export {
  assessments,
  classes,
  grades,
  localeEnum,
  sessions,
  students,
  teachers,
  type AssessmentRow,
  type ClassRow,
  type GradeRow,
  type SessionRow,
  type StudentRow,
  type TeacherRow,
} from "./schema";
export { DrizzleTeacherRepository } from "./repositories/teacher-repository";
export { DrizzleSessionRepository } from "./repositories/session-repository";
export {
  DrizzleAssessmentRepository,
  DrizzleClassRepository,
  DrizzleGradeRepository,
  DrizzleStudentRepository,
} from "./repositories/school-repository";
export { runMigrations } from "./migrator";
export { loadEnv, requireDatabaseUrl } from "./env";
