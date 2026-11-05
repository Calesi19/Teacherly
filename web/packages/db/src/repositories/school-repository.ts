import {
  createGradingScale,
  type Assessment,
  type AssessmentId,
  type AssessmentRepository,
  type AssessmentUpdate,
  type Class,
  type ClassId,
  type ClassRepository,
  type ClassUpdate,
  type Grade,
  type GradeEntry,
  type GradeRepository,
  type NewAssessment,
  type NewClass,
  type NewStudent,
  type Student,
  type StudentId,
  type StudentRepository,
  type StudentUpdate,
  type TeacherId,
} from "@teacherly/core";
import { and, asc, eq, inArray } from "drizzle-orm";

import type { Database } from "../client";
import {
  assessments,
  classes,
  grades,
  students,
  type AssessmentRow,
  type ClassRow,
  type GradeRow,
  type StudentRow,
} from "../schema";

/**
 * The Drizzle implementations of the teacher-owned repositories.
 *
 * Every query in this file has `eq(<table>.teacherId, teacherId)` in its
 * `WHERE`, and the `teacherId` is a parameter the caller could not have
 * invented — `TeacherId` is only mintable here and in the core test fakes, so a
 * route can only pass on what `sessionMiddleware` resolved from a cookie.
 *
 * The scoping lives here and nowhere else. There is no exported query builder,
 * no "find by id" that omits the teacher, and no way to ask these classes for a
 * row without saying whose it is. A caller that wants another teacher's class
 * has no method to call.
 *
 * `is_deleted = false` is in the same `WHERE` for the same reason: a soft-deleted
 * row that a single forgotten filter can resurrect is worse than a hard delete,
 * so the filter is not something call sites remember — it is part of every
 * query the repository can issue.
 */

/** `WHERE teacher_id = $1 AND is_deleted = false`, for the tables that have it. */
const liveClass = (teacherId: TeacherId) =>
  and(eq(classes.teacherId, teacherId), eq(classes.isDeleted, false));

const liveStudent = (teacherId: TeacherId) =>
  and(eq(students.teacherId, teacherId), eq(students.isDeleted, false));

const liveAssessment = (teacherId: TeacherId) =>
  and(eq(assessments.teacherId, teacherId), eq(assessments.isDeleted, false));

function toClass(row: ClassRow): Class {
  return {
    id: row.id,
    teacherId: row.teacherId,
    name: row.name,
    courseName: row.courseName,
    // Run through the validating constructor rather than assembled by hand, so
    // a `Class` in memory can never carry a scale the domain would reject. The
    // CHECK constraints make this unreachable in practice; it is here so that a
    // hand-edited row surfaces as an error instead of as a wrong letter grade.
    gradingScale: createGradingScale({
      a: row.scaleA,
      b: row.scaleB,
      c: row.scaleC,
      d: row.scaleD,
    }),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toStudent(row: StudentRow): Student {
  return {
    id: row.id,
    teacherId: row.teacherId,
    classId: row.classId,
    name: row.name,
    studentNumber: row.studentNumber,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toAssessment(row: AssessmentRow): Assessment {
  return {
    id: row.id,
    teacherId: row.teacherId,
    classId: row.classId,
    name: row.name,
    maxScore: row.maxScore,
    assignedOn: row.assignedOn,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toGrade(row: GradeRow): Grade {
  return {
    teacherId: row.teacherId,
    assessmentId: row.assessmentId,
    studentId: row.studentId,
    score: row.score,
    exempt: row.exempt,
    late: row.late,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/* ------------------------------------------------------------------ classes */

export class DrizzleClassRepository implements ClassRepository {
  constructor(private readonly db: Database) {}

  async create(teacherId: TeacherId, input: NewClass): Promise<Class> {
    const rows = await this.db
      .insert(classes)
      .values({
        teacherId,
        name: input.name,
        courseName: input.courseName,
        scaleA: input.gradingScale.a,
        scaleB: input.gradingScale.b,
        scaleC: input.gradingScale.c,
        scaleD: input.gradingScale.d,
      })
      .returning();
    // `returning()` on a plain insert always yields the row; the non-null
    // assertion is avoided by throwing, so a driver change cannot turn this
    // into an `undefined` leaking out as a `Class`.
    const row = rows[0];
    if (row === undefined) throw new Error("Insert into classes returned no row.");
    return toClass(row);
  }

  async listForTeacher(teacherId: TeacherId): Promise<Class[]> {
    const rows = await this.db
      .select()
      .from(classes)
      .where(liveClass(teacherId))
      .orderBy(asc(classes.courseName), asc(classes.name), asc(classes.id));
    return rows.map(toClass);
  }

  async find(teacherId: TeacherId, classId: ClassId): Promise<Class | null> {
    // `classId` arrives from a URL and is untrusted; pairing it with the
    // session's `teacherId` is what makes it safe, and there is no overload of
    // this method that omits the pairing.
    if (!isUuid(classId)) return null;
    const rows = await this.db
      .select()
      .from(classes)
      .where(and(eq(classes.id, classId), liveClass(teacherId)))
      .limit(1);
    const row = rows[0];
    return row === undefined ? null : toClass(row);
  }

  async update(teacherId: TeacherId, classId: ClassId, input: ClassUpdate): Promise<Class | null> {
    if (!isUuid(classId)) return null;
    const rows = await this.db
      .update(classes)
      .set({
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.courseName === undefined ? {} : { courseName: input.courseName }),
        ...(input.gradingScale === undefined
          ? {}
          : {
              scaleA: input.gradingScale.a,
              scaleB: input.gradingScale.b,
              scaleC: input.gradingScale.c,
              scaleD: input.gradingScale.d,
            }),
        updatedAt: new Date(),
      })
      .where(and(eq(classes.id, classId), liveClass(teacherId)))
      .returning();
    const row = rows[0];
    return row === undefined ? null : toClass(row);
  }

  /**
   * Soft-delete the class and everything under it, in one transaction.
   *
   * The cascade is explicit rather than left to the foreign keys: `ON DELETE
   * CASCADE` fires on a real `DELETE`, and this is an `UPDATE`. Doing it in a
   * transaction is what stops a failure halfway leaving a live student in a
   * deleted class — a row that every class-scoped read would skip and every
   * student-scoped read would return.
   *
   * `grades` needs no row of its own: it has no `is_deleted`, and every read of
   * it goes through a live assessment or a live student.
   */
  async softDelete(teacherId: TeacherId, classId: ClassId): Promise<boolean> {
    if (!isUuid(classId)) return false;
    return this.db.transaction(async (tx) => {
      const deleted = await tx
        .update(classes)
        .set({ isDeleted: true, updatedAt: new Date() })
        .where(and(eq(classes.id, classId), liveClass(teacherId)))
        .returning({ id: classes.id });
      if (deleted[0] === undefined) return false;

      await tx
        .update(students)
        .set({ isDeleted: true, updatedAt: new Date() })
        .where(and(eq(students.classId, classId), liveStudent(teacherId)));
      await tx
        .update(assessments)
        .set({ isDeleted: true, updatedAt: new Date() })
        .where(and(eq(assessments.classId, classId), liveAssessment(teacherId)));
      return true;
    });
  }
}

/* ----------------------------------------------------------------- students */

export class DrizzleStudentRepository implements StudentRepository {
  constructor(private readonly db: Database) {}

  /**
   * The `teacher_id` written here is the session's, never the request's, and the
   * composite foreign key on `(class_id, teacher_id)` means the insert fails
   * outright if `input.classId` is someone else's class. Rather than let that
   * surface as a driver error, the class is resolved first through its own
   * scoped read and a miss becomes `null`.
   */
  async create(teacherId: TeacherId, input: NewStudent): Promise<Student | null> {
    if (!isUuid(input.classId)) return null;
    const owned = await this.db
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.id, input.classId), liveClass(teacherId)))
      .limit(1);
    if (owned[0] === undefined) return null;

    const rows = await this.db
      .insert(students)
      .values({
        teacherId,
        classId: input.classId,
        name: input.name,
        studentNumber: input.studentNumber ?? null,
      })
      .returning();
    const row = rows[0];
    if (row === undefined) throw new Error("Insert into students returned no row.");
    return toStudent(row);
  }

  async listForClass(teacherId: TeacherId, classId: ClassId): Promise<Student[]> {
    if (!isUuid(classId)) return [];
    const rows = await this.db
      .select()
      .from(students)
      .where(and(eq(students.classId, classId), liveStudent(teacherId)))
      .orderBy(asc(students.name), asc(students.id));
    return rows.map(toStudent);
  }

  async find(teacherId: TeacherId, studentId: StudentId): Promise<Student | null> {
    if (!isUuid(studentId)) return null;
    const rows = await this.db
      .select()
      .from(students)
      .where(and(eq(students.id, studentId), liveStudent(teacherId)))
      .limit(1);
    const row = rows[0];
    return row === undefined ? null : toStudent(row);
  }

  async update(
    teacherId: TeacherId,
    studentId: StudentId,
    input: StudentUpdate,
  ): Promise<Student | null> {
    if (!isUuid(studentId)) return null;
    const rows = await this.db
      .update(students)
      .set({
        ...(input.name === undefined ? {} : { name: input.name }),
        // `null` is a value here — "clear the student number" — so the guard is
        // against `undefined` only.
        ...(input.studentNumber === undefined ? {} : { studentNumber: input.studentNumber }),
        updatedAt: new Date(),
      })
      .where(and(eq(students.id, studentId), liveStudent(teacherId)))
      .returning();
    const row = rows[0];
    return row === undefined ? null : toStudent(row);
  }

  async softDelete(teacherId: TeacherId, studentId: StudentId): Promise<boolean> {
    if (!isUuid(studentId)) return false;
    const rows = await this.db
      .update(students)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(and(eq(students.id, studentId), liveStudent(teacherId)))
      .returning({ id: students.id });
    return rows[0] !== undefined;
  }
}

/* -------------------------------------------------------------- assessments */

export class DrizzleAssessmentRepository implements AssessmentRepository {
  constructor(private readonly db: Database) {}

  async create(teacherId: TeacherId, input: NewAssessment): Promise<Assessment | null> {
    if (!isUuid(input.classId)) return null;
    const owned = await this.db
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.id, input.classId), liveClass(teacherId)))
      .limit(1);
    if (owned[0] === undefined) return null;

    const rows = await this.db
      .insert(assessments)
      .values({
        teacherId,
        classId: input.classId,
        name: input.name,
        maxScore: input.maxScore,
        assignedOn: input.assignedOn,
      })
      .returning();
    const row = rows[0];
    if (row === undefined) throw new Error("Insert into assessments returned no row.");
    return toAssessment(row);
  }

  async listForClass(teacherId: TeacherId, classId: ClassId): Promise<Assessment[]> {
    if (!isUuid(classId)) return [];
    const rows = await this.db
      .select()
      .from(assessments)
      .where(and(eq(assessments.classId, classId), liveAssessment(teacherId)))
      .orderBy(asc(assessments.assignedOn), asc(assessments.name), asc(assessments.id));
    return rows.map(toAssessment);
  }

  async find(teacherId: TeacherId, assessmentId: AssessmentId): Promise<Assessment | null> {
    if (!isUuid(assessmentId)) return null;
    const rows = await this.db
      .select()
      .from(assessments)
      .where(and(eq(assessments.id, assessmentId), liveAssessment(teacherId)))
      .limit(1);
    const row = rows[0];
    return row === undefined ? null : toAssessment(row);
  }

  async update(
    teacherId: TeacherId,
    assessmentId: AssessmentId,
    input: AssessmentUpdate,
  ): Promise<Assessment | null> {
    if (!isUuid(assessmentId)) return null;
    const rows = await this.db
      .update(assessments)
      .set({
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.maxScore === undefined ? {} : { maxScore: input.maxScore }),
        ...(input.assignedOn === undefined ? {} : { assignedOn: input.assignedOn }),
        updatedAt: new Date(),
      })
      .where(and(eq(assessments.id, assessmentId), liveAssessment(teacherId)))
      .returning();
    const row = rows[0];
    return row === undefined ? null : toAssessment(row);
  }

  async softDelete(teacherId: TeacherId, assessmentId: AssessmentId): Promise<boolean> {
    if (!isUuid(assessmentId)) return false;
    const rows = await this.db
      .update(assessments)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(and(eq(assessments.id, assessmentId), liveAssessment(teacherId)))
      .returning({ id: assessments.id });
    return rows[0] !== undefined;
  }
}

/* ------------------------------------------------------------------- grades */

export class DrizzleGradeRepository implements GradeRepository {
  constructor(private readonly db: Database) {}

  /**
   * Upsert. Both sides are resolved through their own scoped reads first — not
   * to decide ownership, which the composite foreign keys already decide, but so
   * that a cross-teacher or cross-class write comes back as `null` and a 404
   * rather than as a constraint violation and a 500.
   *
   * The cross-*class* check is the one the foreign keys cannot make: a teacher's
   * own student and own assessment can belong to two different classes of
   * theirs, and a grade linking them would be meaningless.
   */
  async put(
    teacherId: TeacherId,
    assessmentId: AssessmentId,
    studentId: StudentId,
    entry: GradeEntry,
  ): Promise<Grade | null> {
    if (!isUuid(assessmentId) || !isUuid(studentId)) return null;

    const [assessment] = await this.db
      .select({ classId: assessments.classId })
      .from(assessments)
      .where(and(eq(assessments.id, assessmentId), liveAssessment(teacherId)))
      .limit(1);
    if (assessment === undefined) return null;

    const [student] = await this.db
      .select({ classId: students.classId })
      .from(students)
      .where(and(eq(students.id, studentId), liveStudent(teacherId)))
      .limit(1);
    if (student === undefined) return null;
    if (student.classId !== assessment.classId) return null;

    const rows = await this.db
      .insert(grades)
      .values({
        teacherId,
        assessmentId,
        studentId,
        score: entry.score,
        exempt: entry.exempt,
        late: entry.late,
      })
      .onConflictDoUpdate({
        target: [grades.assessmentId, grades.studentId],
        set: {
          score: entry.score,
          exempt: entry.exempt,
          late: entry.late,
          updatedAt: new Date(),
        },
        // Belt and braces on top of the composite foreign keys: even an
        // ON CONFLICT path cannot write over another teacher's row.
        setWhere: eq(grades.teacherId, teacherId),
      })
      .returning();
    const row = rows[0];
    if (row === undefined) throw new Error("Upsert into grades returned no row.");
    return toGrade(row);
  }

  /**
   * The one hard delete in this chunk, and deliberate — see the port's comment.
   * Removing the row is how a pair returns to "ungraded", which is a state the
   * formula distinguishes from a zero, so there is nothing to soft-delete.
   */
  async clear(
    teacherId: TeacherId,
    assessmentId: AssessmentId,
    studentId: StudentId,
  ): Promise<boolean> {
    if (!isUuid(assessmentId) || !isUuid(studentId)) return false;
    const rows = await this.db
      .delete(grades)
      .where(
        and(
          eq(grades.teacherId, teacherId),
          eq(grades.assessmentId, assessmentId),
          eq(grades.studentId, studentId),
        ),
      )
      .returning({ studentId: grades.studentId });
    return rows[0] !== undefined;
  }

  /**
   * Every grade in a class, for the gradebook.
   *
   * Scoped by `teacher_id` on `grades` itself, then narrowed to the class's live
   * assessments. The subquery is over `assessments` and is *also* teacher-scoped,
   * so neither half of this can be made to reach outside the workspace.
   */
  async listForClass(teacherId: TeacherId, classId: ClassId): Promise<Grade[]> {
    if (!isUuid(classId)) return [];
    const liveIds = this.db
      .select({ id: assessments.id })
      .from(assessments)
      .where(and(eq(assessments.classId, classId), liveAssessment(teacherId)));

    const rows = await this.db
      .select()
      .from(grades)
      .where(and(eq(grades.teacherId, teacherId), inArray(grades.assessmentId, liveIds)));
    return rows.map(toGrade);
  }

  async listForAssessment(teacherId: TeacherId, assessmentId: AssessmentId): Promise<Grade[]> {
    if (!isUuid(assessmentId)) return [];
    const rows = await this.db
      .select()
      .from(grades)
      .where(and(eq(grades.teacherId, teacherId), eq(grades.assessmentId, assessmentId)));
    return rows.map(toGrade);
  }
}

/**
 * Whether a string can be a `uuid` column value.
 *
 * Checked in TypeScript rather than left to Postgres because comparing a `uuid`
 * column to a malformed literal is an `invalid input syntax` *error*, not an
 * empty result — so `GET /api/classes/not-a-uuid` would be a 500 instead of the
 * 404 it should be. A caller must not be able to tell a bad id from someone
 * else's id, and this is what keeps the two answers the same.
 */
function isUuid(value: string): boolean {
  return UUID_SHAPE.test(value);
}

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
