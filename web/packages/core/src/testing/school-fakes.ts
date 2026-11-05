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
import { asTeacherId, type TeacherId } from "../domain/teacher";
import type {
  AssessmentRepository,
  ClassRepository,
  GradeRepository,
  StudentRepository,
} from "../ports/school-repository";

/**
 * In-memory implementations of the four teacher-owned repositories.
 *
 * These exist so route-level tests can drive the real `createApp` with no
 * Postgres. That makes them part of the test contract, not a convenience: if
 * these fakes were more permissive than the Drizzle implementations, a route
 * test could pass while the real thing leaked across teachers. So each one
 * mirrors the behaviours the SQL relies on, and the ones that matter are:
 *
 *   1. Every read and write filters on `teacherId` first. A lookup that finds a
 *      row belonging to someone else returns `null`, exactly as a
 *      `WHERE ... AND teacher_id = $1` returns no row — never a thrown
 *      "forbidden", because the caller must not be able to tell "not yours"
 *      from "does not exist".
 *   2. Soft-deleted rows are invisible to every read, and deleting a class
 *      cascades to its students and assessments the way the repository's
 *      transaction does.
 *   3. `grades.put` resolves both sides scoped to the teacher and refuses a
 *      pair from two different classes — the check the composite foreign keys
 *      cannot make.
 *   4. `grades.clear` removes the row rather than flagging it, so "ungraded"
 *      stays distinguishable from "scored zero".
 *
 * All four share one `SchoolStore` so that a class deleted through
 * `ClassRepository` is gone from `StudentRepository` too, as it would be in one
 * database.
 */

/** A stored row: the entity plus the soft-delete flag reads filter on. */
interface Soft<T> {
  entity: T;
  isDeleted: boolean;
}

/**
 * The shared tables. Holding the four repositories' state in one object is what
 * makes the cascade and the cross-table ownership checks real rather than
 * per-repository fiction.
 */
export class SchoolStore {
  readonly classes = new Map<ClassId, Soft<Class>>();
  readonly students = new Map<StudentId, Soft<Student>>();
  readonly assessments = new Map<AssessmentId, Soft<Assessment>>();
  /** Keyed `${assessmentId}\u0000${studentId}` — the composite primary key. */
  readonly grades = new Map<string, Grade>();

  private sequence = 0;

  /**
   * Ids are sequential and prefixed rather than UUID-shaped. The Drizzle
   * repositories reject a malformed id early so a bad one 404s instead of
   * erroring in Postgres; here any unknown string simply misses the map, which
   * is the same answer by a shorter route.
   */
  nextId(prefix: string): string {
    this.sequence += 1;
    return `${prefix}-${this.sequence}`;
  }

  /** A live class of this teacher's, or `undefined`. The scoping primitive. */
  liveClass(teacherId: TeacherId, classId: ClassId): Class | undefined {
    const stored = this.classes.get(classId);
    if (stored === undefined || stored.isDeleted) return undefined;
    return stored.entity.teacherId === teacherId ? stored.entity : undefined;
  }

  liveStudent(teacherId: TeacherId, studentId: StudentId): Student | undefined {
    const stored = this.students.get(studentId);
    if (stored === undefined || stored.isDeleted) return undefined;
    return stored.entity.teacherId === teacherId ? stored.entity : undefined;
  }

  liveAssessment(teacherId: TeacherId, assessmentId: AssessmentId): Assessment | undefined {
    const stored = this.assessments.get(assessmentId);
    if (stored === undefined || stored.isDeleted) return undefined;
    return stored.entity.teacherId === teacherId ? stored.entity : undefined;
  }

  gradeKey(assessmentId: AssessmentId, studentId: StudentId): string {
    return `${assessmentId}\u0000${studentId}`;
  }

  /**
   * A teacher id for a test to hand to a repository.
   *
   * `packages/core/src/testing` is one of the two sanctioned mint sites — see
   * `scripts/check-core-purity.mjs`, which lets this call through here and fails
   * the build on it anywhere under `apps/`. A route test therefore gets its
   * teacher ids from this function and cannot invent one inline, which is the
   * same constraint the production code is under.
   */
  static teacher(label: string): TeacherId {
    return asTeacherId(label);
  }
}

/** The clock these fakes stamp rows with. Fixed, so assertions can name it. */
const FIXED_NOW = new Date("2026-01-15T09:00:00.000Z");

export class InMemoryClassRepository implements ClassRepository {
  constructor(private readonly store: SchoolStore) {}

  async create(teacherId: TeacherId, input: NewClass): Promise<Class> {
    const created: Class = {
      id: this.store.nextId("class"),
      teacherId,
      name: input.name,
      courseName: input.courseName,
      gradingScale: input.gradingScale,
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
    };
    this.store.classes.set(created.id, { entity: created, isDeleted: false });
    return created;
  }

  async listForTeacher(teacherId: TeacherId): Promise<Class[]> {
    return [...this.store.classes.values()]
      .filter((stored) => !stored.isDeleted && stored.entity.teacherId === teacherId)
      .map((stored) => stored.entity);
  }

  async find(teacherId: TeacherId, classId: ClassId): Promise<Class | null> {
    return this.store.liveClass(teacherId, classId) ?? null;
  }

  async update(
    teacherId: TeacherId,
    classId: ClassId,
    input: ClassUpdate,
  ): Promise<Class | null> {
    const existing = this.store.liveClass(teacherId, classId);
    if (existing === undefined) return null;

    // An absent field is left alone, matching the repository's conditional
    // `set`. A test that patches only `name` must not blank `courseName`.
    const updated: Class = {
      ...existing,
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.courseName === undefined ? {} : { courseName: input.courseName }),
      ...(input.gradingScale === undefined ? {} : { gradingScale: input.gradingScale }),
      updatedAt: FIXED_NOW,
    };
    this.store.classes.set(classId, { entity: updated, isDeleted: false });
    return updated;
  }

  /** Soft-delete, cascading to students and assessments as the transaction does. */
  async softDelete(teacherId: TeacherId, classId: ClassId): Promise<boolean> {
    const existing = this.store.liveClass(teacherId, classId);
    if (existing === undefined) return false;

    this.store.classes.set(classId, { entity: existing, isDeleted: true });
    for (const [id, stored] of this.store.students) {
      if (stored.entity.classId === classId && stored.entity.teacherId === teacherId) {
        this.store.students.set(id, { entity: stored.entity, isDeleted: true });
      }
    }
    for (const [id, stored] of this.store.assessments) {
      if (stored.entity.classId === classId && stored.entity.teacherId === teacherId) {
        this.store.assessments.set(id, { entity: stored.entity, isDeleted: true });
      }
    }
    return true;
  }
}

export class InMemoryStudentRepository implements StudentRepository {
  constructor(private readonly store: SchoolStore) {}

  /** `null` when the target class is not this teacher's live class. */
  async create(teacherId: TeacherId, input: NewStudent): Promise<Student | null> {
    if (this.store.liveClass(teacherId, input.classId) === undefined) return null;

    const created: Student = {
      id: this.store.nextId("student"),
      teacherId,
      classId: input.classId,
      name: input.name,
      studentNumber: input.studentNumber ?? null,
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
    };
    this.store.students.set(created.id, { entity: created, isDeleted: false });
    return created;
  }

  async listForClass(teacherId: TeacherId, classId: ClassId): Promise<Student[]> {
    return [...this.store.students.values()]
      .filter(
        (stored) =>
          !stored.isDeleted &&
          stored.entity.teacherId === teacherId &&
          stored.entity.classId === classId,
      )
      .map((stored) => stored.entity);
  }

  async find(teacherId: TeacherId, studentId: StudentId): Promise<Student | null> {
    return this.store.liveStudent(teacherId, studentId) ?? null;
  }

  async update(
    teacherId: TeacherId,
    studentId: StudentId,
    input: StudentUpdate,
  ): Promise<Student | null> {
    const existing = this.store.liveStudent(teacherId, studentId);
    if (existing === undefined) return null;

    const updated: Student = {
      ...existing,
      ...(input.name === undefined ? {} : { name: input.name }),
      // `studentNumber` is explicitly nullable: `null` clears it, `undefined`
      // leaves it. Collapsing the two would make "remove the number" impossible.
      ...(input.studentNumber === undefined ? {} : { studentNumber: input.studentNumber }),
      updatedAt: FIXED_NOW,
    };
    this.store.students.set(studentId, { entity: updated, isDeleted: false });
    return updated;
  }

  async softDelete(teacherId: TeacherId, studentId: StudentId): Promise<boolean> {
    const existing = this.store.liveStudent(teacherId, studentId);
    if (existing === undefined) return false;
    this.store.students.set(studentId, { entity: existing, isDeleted: true });
    return true;
  }
}

export class InMemoryAssessmentRepository implements AssessmentRepository {
  constructor(private readonly store: SchoolStore) {}

  async create(teacherId: TeacherId, input: NewAssessment): Promise<Assessment | null> {
    if (this.store.liveClass(teacherId, input.classId) === undefined) return null;

    const created: Assessment = {
      id: this.store.nextId("assessment"),
      teacherId,
      classId: input.classId,
      name: input.name,
      maxScore: input.maxScore,
      assignedOn: input.assignedOn,
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
    };
    this.store.assessments.set(created.id, { entity: created, isDeleted: false });
    return created;
  }

  async listForClass(teacherId: TeacherId, classId: ClassId): Promise<Assessment[]> {
    return [...this.store.assessments.values()]
      .filter(
        (stored) =>
          !stored.isDeleted &&
          stored.entity.teacherId === teacherId &&
          stored.entity.classId === classId,
      )
      .map((stored) => stored.entity);
  }

  async find(teacherId: TeacherId, assessmentId: AssessmentId): Promise<Assessment | null> {
    return this.store.liveAssessment(teacherId, assessmentId) ?? null;
  }

  async update(
    teacherId: TeacherId,
    assessmentId: AssessmentId,
    input: AssessmentUpdate,
  ): Promise<Assessment | null> {
    const existing = this.store.liveAssessment(teacherId, assessmentId);
    if (existing === undefined) return null;

    const updated: Assessment = {
      ...existing,
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.maxScore === undefined ? {} : { maxScore: input.maxScore }),
      ...(input.assignedOn === undefined ? {} : { assignedOn: input.assignedOn }),
      updatedAt: FIXED_NOW,
    };
    this.store.assessments.set(assessmentId, { entity: updated, isDeleted: false });
    return updated;
  }

  async softDelete(teacherId: TeacherId, assessmentId: AssessmentId): Promise<boolean> {
    const existing = this.store.liveAssessment(teacherId, assessmentId);
    if (existing === undefined) return false;
    this.store.assessments.set(assessmentId, { entity: existing, isDeleted: true });
    return true;
  }
}

export class InMemoryGradeRepository implements GradeRepository {
  constructor(private readonly store: SchoolStore) {}

  /**
   * Upsert, with both sides resolved scoped to the teacher first.
   *
   * The third check — that the two are in the same class — is the one the real
   * schema's composite foreign keys cannot make, so it has to be here too or a
   * route test would not be exercising the same rule as production.
   */
  async put(
    teacherId: TeacherId,
    assessmentId: AssessmentId,
    studentId: StudentId,
    entry: GradeEntry,
  ): Promise<Grade | null> {
    const assessment = this.store.liveAssessment(teacherId, assessmentId);
    if (assessment === undefined) return null;
    const student = this.store.liveStudent(teacherId, studentId);
    if (student === undefined) return null;
    if (student.classId !== assessment.classId) return null;

    const key = this.store.gradeKey(assessmentId, studentId);
    const saved: Grade = {
      teacherId,
      assessmentId,
      studentId,
      score: entry.score,
      exempt: entry.exempt,
      late: entry.late,
      createdAt: this.store.grades.get(key)?.createdAt ?? FIXED_NOW,
      updatedAt: FIXED_NOW,
    };
    this.store.grades.set(key, saved);
    return saved;
  }

  /** A hard delete, as in the real repository: the row going away *is* the state. */
  async clear(
    teacherId: TeacherId,
    assessmentId: AssessmentId,
    studentId: StudentId,
  ): Promise<boolean> {
    const key = this.store.gradeKey(assessmentId, studentId);
    const existing = this.store.grades.get(key);
    if (existing === undefined || existing.teacherId !== teacherId) return false;
    this.store.grades.delete(key);
    return true;
  }

  async listForClass(teacherId: TeacherId, classId: ClassId): Promise<Grade[]> {
    // Narrowed through the class's *live* assessments, matching the subquery:
    // a grade on a soft-deleted assessment must not reach the formula.
    const liveIds = new Set(
      [...this.store.assessments.values()]
        .filter(
          (stored) =>
            !stored.isDeleted &&
            stored.entity.teacherId === teacherId &&
            stored.entity.classId === classId,
        )
        .map((stored) => stored.entity.id),
    );

    return [...this.store.grades.values()].filter(
      (grade) => grade.teacherId === teacherId && liveIds.has(grade.assessmentId),
    );
  }

  async listForAssessment(teacherId: TeacherId, assessmentId: AssessmentId): Promise<Grade[]> {
    return [...this.store.grades.values()].filter(
      (grade) => grade.teacherId === teacherId && grade.assessmentId === assessmentId,
    );
  }
}

/** The four fakes over one store, as `SchoolServiceDeps` / `GradebookServiceDeps`. */
export function createSchoolFakes(store: SchoolStore = new SchoolStore()): {
  store: SchoolStore;
  classes: InMemoryClassRepository;
  students: InMemoryStudentRepository;
  assessments: InMemoryAssessmentRepository;
  grades: InMemoryGradeRepository;
} {
  return {
    store,
    classes: new InMemoryClassRepository(store),
    students: new InMemoryStudentRepository(store),
    assessments: new InMemoryAssessmentRepository(store),
    grades: new InMemoryGradeRepository(store),
  };
}
