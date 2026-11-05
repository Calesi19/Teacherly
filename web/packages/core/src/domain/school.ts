import type { GradingScale } from "../grading";
import type { TeacherId } from "./teacher";

/**
 * Identifiers for the teacher-owned records.
 *
 * Deliberately *not* branded, unlike `TeacherId`, and the asymmetry is the
 * whole design:
 *
 *   - A `TeacherId` names a workspace. If a route could produce one from
 *     request data it could read another teacher's workspace, so the brand
 *     makes "mint a teacher id" a compile error outside `packages/db`.
 *   - A `ClassId` names a record *inside* some workspace, and it legitimately
 *     arrives in a URL — `GET /api/classes/:classId` is the whole point.
 *     Branding it would force the route to cast, which would be a brand that
 *     proves nothing while reading as though it proves something.
 *
 * What makes an id from a URL safe is not its type but that no repository
 * method will accept one without a `TeacherId` beside it: every lookup is
 * `WHERE id = $id AND teacher_id = $teacher`, so another teacher's id resolves
 * to no row and the route answers 404. Ownership is a property of the query,
 * not of the string.
 */
export type ClassId = string;
export type StudentId = string;
export type AssessmentId = string;

/**
 * A class: the desktop app's `groups` table, renamed.
 *
 * `courseName` is the desktop app's `period_name`, which was a column on
 * `assignments` holding a free-text course label and was never a schedule
 * period. Here it belongs to the class, where it describes the class once
 * rather than being copied onto every assessment.
 *
 * `gradingScale` is already validated — the repository builds it through
 * `createGradingScale`, so a `Class` in hand cannot carry a broken scale.
 */
export interface Class {
  id: ClassId;
  teacherId: TeacherId;
  name: string;
  courseName: string;
  gradingScale: GradingScale;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewClass {
  name: string;
  courseName: string;
  gradingScale: GradingScale;
}

/** A partial update. An absent field is left alone; no field is nullable. */
export interface ClassUpdate {
  name?: string | undefined;
  courseName?: string | undefined;
  gradingScale?: GradingScale | undefined;
}

export interface Student {
  id: StudentId;
  teacherId: TeacherId;
  classId: ClassId;
  name: string;
  /** The school's own identifier for the student, when there is one. */
  studentNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewStudent {
  classId: ClassId;
  name: string;
  studentNumber?: string | null | undefined;
}

export interface StudentUpdate {
  name?: string | undefined;
  studentNumber?: string | null | undefined;
}

/**
 * An assessment: the desktop app's `assignments`, renamed, and narrowed to what
 * grading needs. The desktop app's `description` and `tag` are out of scope for
 * this chunk.
 *
 * `assignedOn` is a calendar date, not an instant: an assessment happens on a
 * school day, and a timestamp would make the same assessment fall on two
 * different days either side of midnight in two different time zones.
 */
export interface Assessment {
  id: AssessmentId;
  teacherId: TeacherId;
  classId: ClassId;
  name: string;
  maxScore: number;
  /** `YYYY-MM-DD`. */
  assignedOn: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewAssessment {
  classId: ClassId;
  name: string;
  maxScore: number;
  assignedOn: string;
}

export interface AssessmentUpdate {
  name?: string | undefined;
  maxScore?: number | undefined;
  assignedOn?: string | undefined;
}

/**
 * One recorded grade, for one (assessment, student) pair.
 *
 * `score: null` is a row that exists without a score. It is *not* the same as
 * having no row — the row records a `late` flag or an exemption ahead of
 * marking — but for the formula both are "ungraded". See `GradableGrade`.
 */
export interface Grade {
  teacherId: TeacherId;
  assessmentId: AssessmentId;
  studentId: StudentId;
  score: number | null;
  exempt: boolean;
  /** Recorded and reported. Never scored. */
  late: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * What a teacher records for one pair. Always a full replacement rather than a
 * patch: a grade is three small fields, and a partial update would make
 * "clear the score but keep the late flag" ambiguous.
 */
export interface GradeEntry {
  score: number | null;
  exempt: boolean;
  late: boolean;
}
