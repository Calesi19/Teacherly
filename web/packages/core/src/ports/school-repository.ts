import type {
  Assessment,
  AssessmentId,
  AssessmentUpdate,
  Class,
  ClassId,
  ClassUpdate,
  Grade,
  GradeEntry,
  NewAssessment,
  NewClass,
  NewStudent,
  Student,
  StudentId,
  StudentUpdate,
} from "../domain/school";
import type { TeacherId } from "../domain/teacher";

/**
 * The repository ports for teacher-owned data.
 *
 * Every method takes a `TeacherId` as its first parameter. That is not a
 * convention to be remembered — it is the signature, so a call site that has no
 * `TeacherId` does not compile, and a `TeacherId` can only be obtained from the
 * session (see `asTeacherId`). The implementation is then obliged to put it in
 * the `WHERE` clause.
 *
 * This is what replaces the desktop app's 82 individually-scoped SQL queries.
 * There, scoping was a `WHERE group_id = ?` that each of 82 call sites had to
 * get right, and the 83rd would have been wrong silently. Here there is no
 * unscoped read to write: `findById(classId)` is not a method that exists.
 *
 * `null` rather than a thrown error for a miss, because the two cases a miss
 * covers — no such record, and someone else's record — must be indistinguishable
 * to the caller. The service layer turns `null` into `NotFoundError`; see the
 * note there.
 */

export interface ClassRepository {
  create(teacherId: TeacherId, input: NewClass): Promise<Class>;
  listForTeacher(teacherId: TeacherId): Promise<Class[]>;
  find(teacherId: TeacherId, classId: ClassId): Promise<Class | null>;
  update(teacherId: TeacherId, classId: ClassId, input: ClassUpdate): Promise<Class | null>;
  /**
   * Soft-delete, cascading to the class's students, assessments and grades in
   * one transaction. Returns `false` when the class is not this teacher's, so
   * the route can answer 404 without a separate ownership read.
   */
  softDelete(teacherId: TeacherId, classId: ClassId): Promise<boolean>;
}

export interface StudentRepository {
  /** `null` when `input.classId` is not this teacher's class. */
  create(teacherId: TeacherId, input: NewStudent): Promise<Student | null>;
  listForClass(teacherId: TeacherId, classId: ClassId): Promise<Student[]>;
  find(teacherId: TeacherId, studentId: StudentId): Promise<Student | null>;
  update(teacherId: TeacherId, studentId: StudentId, input: StudentUpdate): Promise<Student | null>;
  softDelete(teacherId: TeacherId, studentId: StudentId): Promise<boolean>;
}

export interface AssessmentRepository {
  /** `null` when `input.classId` is not this teacher's class. */
  create(teacherId: TeacherId, input: NewAssessment): Promise<Assessment | null>;
  listForClass(teacherId: TeacherId, classId: ClassId): Promise<Assessment[]>;
  find(teacherId: TeacherId, assessmentId: AssessmentId): Promise<Assessment | null>;
  update(
    teacherId: TeacherId,
    assessmentId: AssessmentId,
    input: AssessmentUpdate,
  ): Promise<Assessment | null>;
  softDelete(teacherId: TeacherId, assessmentId: AssessmentId): Promise<boolean>;
}

export interface GradeRepository {
  /**
   * Record or replace the grade for one (assessment, student) pair.
   *
   * `null` when either side is not this teacher's, *or* when the two belong to
   * different classes — a grade only means something when the student is in the
   * class the assessment belongs to.
   */
  put(
    teacherId: TeacherId,
    assessmentId: AssessmentId,
    studentId: StudentId,
    entry: GradeEntry,
  ): Promise<Grade | null>;

  /**
   * Remove the row entirely, returning the pair to "ungraded".
   *
   * A hard delete, and the one place in this chunk that is. A soft-deleted
   * grade would be a row that exists and does not count, which is precisely
   * the "missing row versus zero score" distinction the schema is built to keep
   * unambiguous — `is_deleted` on `grades` would add a third state that reads
   * like the second. Clearing a grade is also not a destructive act a teacher
   * needs to recover from: the row holds one number they can retype.
   */
  clear(teacherId: TeacherId, assessmentId: AssessmentId, studentId: StudentId): Promise<boolean>;

  listForClass(teacherId: TeacherId, classId: ClassId): Promise<Grade[]>;
  listForAssessment(teacherId: TeacherId, assessmentId: AssessmentId): Promise<Grade[]>;
}
