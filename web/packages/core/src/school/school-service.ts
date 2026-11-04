import { NotFoundError } from "../domain/errors";
import type {
  Assessment,
  AssessmentId,
  Class,
  ClassId,
  Grade,
  Student,
  StudentId,
} from "../domain/school";
import type { TeacherId } from "../domain/teacher";
import type {
  AssessmentRepository,
  ClassRepository,
  GradeRepository,
  StudentRepository,
} from "../ports/school-repository";
import {
  validateAssessmentUpdate,
  validateClassUpdate,
  validateGradeEntry,
  validateNewAssessment,
  validateNewClass,
  validateNewStudent,
  validateStudentUpdate,
} from "./validation";

export interface SchoolServiceDeps {
  classes: ClassRepository;
  students: StudentRepository;
  assessments: AssessmentRepository;
  grades: GradeRepository;
}

/**
 * CRUD for classes, students, assessments and grades.
 *
 * Every method's first parameter is a `TeacherId`, which only the session
 * middleware can supply, and every method passes it straight to a repository
 * that will not read without it. There is no `getClass(id)` here for a route to
 * reach for by mistake — the narrow surface *is* the tenant isolation.
 *
 * The service's own job is small and deliberately so: validate the untrusted
 * body, and turn a repository's `null` into `NotFoundError`. It holds no
 * ownership logic, because ownership is decided in the `WHERE` clause.
 */
export class SchoolService {
  constructor(private readonly deps: SchoolServiceDeps) {}

  /* ---------------------------------------------------------------- classes */

  async createClass(teacherId: TeacherId, body: Record<string, unknown>): Promise<Class> {
    return this.deps.classes.create(teacherId, validateNewClass(body));
  }

  async listClasses(teacherId: TeacherId): Promise<Class[]> {
    return this.deps.classes.listForTeacher(teacherId);
  }

  async getClass(teacherId: TeacherId, classId: ClassId): Promise<Class> {
    return required(await this.deps.classes.find(teacherId, classId), "class");
  }

  async updateClass(
    teacherId: TeacherId,
    classId: ClassId,
    body: Record<string, unknown>,
  ): Promise<Class> {
    const update = validateClassUpdate(body);
    return required(await this.deps.classes.update(teacherId, classId, update), "class");
  }

  async deleteClass(teacherId: TeacherId, classId: ClassId): Promise<void> {
    if (!(await this.deps.classes.softDelete(teacherId, classId))) {
      throw new NotFoundError("class");
    }
  }

  /* --------------------------------------------------------------- students */

  async createStudent(
    teacherId: TeacherId,
    classId: ClassId,
    body: Record<string, unknown>,
  ): Promise<Student> {
    const input = validateNewStudent(classId, body);
    // `null` means the class is not this teacher's. Reported as a missing
    // *class*, which is what the caller named, and which says nothing about
    // whether that class exists for someone else.
    return required(await this.deps.students.create(teacherId, input), "class");
  }

  async listStudents(teacherId: TeacherId, classId: ClassId): Promise<Student[]> {
    // Checked first so an unknown or foreign class is a 404 rather than an
    // empty list, which would read as "this class of yours has no students".
    await this.getClass(teacherId, classId);
    return this.deps.students.listForClass(teacherId, classId);
  }

  async getStudent(teacherId: TeacherId, studentId: StudentId): Promise<Student> {
    return required(await this.deps.students.find(teacherId, studentId), "student");
  }

  async updateStudent(
    teacherId: TeacherId,
    studentId: StudentId,
    body: Record<string, unknown>,
  ): Promise<Student> {
    const update = validateStudentUpdate(body);
    return required(await this.deps.students.update(teacherId, studentId, update), "student");
  }

  async deleteStudent(teacherId: TeacherId, studentId: StudentId): Promise<void> {
    if (!(await this.deps.students.softDelete(teacherId, studentId))) {
      throw new NotFoundError("student");
    }
  }

  /* ------------------------------------------------------------ assessments */

  async createAssessment(
    teacherId: TeacherId,
    classId: ClassId,
    body: Record<string, unknown>,
  ): Promise<Assessment> {
    const input = validateNewAssessment(classId, body);
    return required(await this.deps.assessments.create(teacherId, input), "class");
  }

  async listAssessments(teacherId: TeacherId, classId: ClassId): Promise<Assessment[]> {
    await this.getClass(teacherId, classId);
    return this.deps.assessments.listForClass(teacherId, classId);
  }

  async getAssessment(teacherId: TeacherId, assessmentId: AssessmentId): Promise<Assessment> {
    return required(await this.deps.assessments.find(teacherId, assessmentId), "assessment");
  }

  async updateAssessment(
    teacherId: TeacherId,
    assessmentId: AssessmentId,
    body: Record<string, unknown>,
  ): Promise<Assessment> {
    const update = validateAssessmentUpdate(body);
    return required(
      await this.deps.assessments.update(teacherId, assessmentId, update),
      "assessment",
    );
  }

  async deleteAssessment(teacherId: TeacherId, assessmentId: AssessmentId): Promise<void> {
    if (!(await this.deps.assessments.softDelete(teacherId, assessmentId))) {
      throw new NotFoundError("assessment");
    }
  }

  /* ----------------------------------------------------------------- grades */

  async putGrade(
    teacherId: TeacherId,
    assessmentId: AssessmentId,
    studentId: StudentId,
    body: Record<string, unknown>,
  ): Promise<Grade> {
    const entry = validateGradeEntry(body);
    // A `null` here covers three cases the repository cannot and should not
    // tell apart for the caller: no such assessment, no such student, and the
    // two being in different classes.
    return required(
      await this.deps.grades.put(teacherId, assessmentId, studentId, entry),
      "assessment",
    );
  }

  async clearGrade(
    teacherId: TeacherId,
    assessmentId: AssessmentId,
    studentId: StudentId,
  ): Promise<void> {
    if (!(await this.deps.grades.clear(teacherId, assessmentId, studentId))) {
      throw new NotFoundError("grade");
    }
  }

  async listGradesForAssessment(
    teacherId: TeacherId,
    assessmentId: AssessmentId,
  ): Promise<Grade[]> {
    await this.getAssessment(teacherId, assessmentId);
    return this.deps.grades.listForAssessment(teacherId, assessmentId);
  }
}

/**
 * `null` -> 404.
 *
 * One helper for every lookup so the "not found and not yours are the same
 * answer" rule cannot be forgotten at one call site out of twenty.
 */
function required<T>(value: T | null, kind: "class" | "student" | "assessment" | "grade"): T {
  if (value === null) throw new NotFoundError(kind);
  return value;
}
