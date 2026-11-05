import type {
  Assessment,
  AssessmentResult,
  Class,
  Grade,
  GradeTotals,
  Letter,
  Student,
  StudentClassGrade,
} from "@teacherly/core";

/**
 * Entity -> JSON. One place, so the wire shape is reviewable in one read and
 * no route can accidentally return a column the client has no business seeing.
 *
 * `teacherId` is never serialized. The client already knows who it is from
 * `GET /api/me`, and echoing the workspace key back on every row would put it
 * in browser caches and logs for no gain.
 *
 * No percentage or letter is computed here — these functions only copy numbers
 * the grading module already decided. `pnpm check:core-purity` enforces that
 * textually; see the grading section of `scripts/check-core-purity.mjs`.
 */

export interface ClassResponse {
  id: string;
  name: string;
  courseName: string;
  gradingScale: { a: number; b: number; c: number; d: number };
  createdAt: string;
  updatedAt: string;
}

export function toClassResponse(value: Class): ClassResponse {
  return {
    id: value.id,
    name: value.name,
    courseName: value.courseName,
    gradingScale: {
      a: value.gradingScale.a,
      b: value.gradingScale.b,
      c: value.gradingScale.c,
      d: value.gradingScale.d,
    },
    createdAt: value.createdAt.toISOString(),
    updatedAt: value.updatedAt.toISOString(),
  };
}

export interface StudentResponse {
  id: string;
  classId: string;
  name: string;
  studentNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toStudentResponse(value: Student): StudentResponse {
  return {
    id: value.id,
    classId: value.classId,
    name: value.name,
    studentNumber: value.studentNumber,
    createdAt: value.createdAt.toISOString(),
    updatedAt: value.updatedAt.toISOString(),
  };
}

export interface AssessmentResponse {
  id: string;
  classId: string;
  name: string;
  maxScore: number;
  assignedOn: string;
  createdAt: string;
  updatedAt: string;
}

export function toAssessmentResponse(value: Assessment): AssessmentResponse {
  return {
    id: value.id,
    classId: value.classId,
    name: value.name,
    maxScore: value.maxScore,
    assignedOn: value.assignedOn,
    createdAt: value.createdAt.toISOString(),
    updatedAt: value.updatedAt.toISOString(),
  };
}

export interface GradeResponse {
  assessmentId: string;
  studentId: string;
  score: number | null;
  exempt: boolean;
  late: boolean;
  updatedAt: string;
}

export function toGradeResponse(value: Grade): GradeResponse {
  return {
    assessmentId: value.assessmentId,
    studentId: value.studentId,
    score: value.score,
    exempt: value.exempt,
    late: value.late,
    updatedAt: value.updatedAt.toISOString(),
  };
}

/** The fraction behind a percentage, so a `null` percentage explains itself. */
export interface TotalsResponse {
  pointsEarned: number;
  pointsPossible: number;
  counted: number;
  exempt: number;
  ungraded: number;
}

export function toTotalsResponse(totals: GradeTotals): TotalsResponse {
  return {
    pointsEarned: totals.pointsEarned,
    pointsPossible: totals.pointsPossible,
    counted: totals.counted,
    exempt: totals.exempt,
    ungraded: totals.ungraded,
  };
}

export interface StudentClassGradeResponse {
  studentId: string;
  /** `null` means "no percentage exists", never 0. See `StudentClassGrade`. */
  percentage: number | null;
  letter: Letter | null;
  totals: TotalsResponse;
}

export function toStudentClassGradeResponse(
  value: StudentClassGrade,
): StudentClassGradeResponse {
  return {
    studentId: value.studentId,
    percentage: value.percentage,
    letter: value.letter,
    totals: toTotalsResponse(value.totals),
  };
}

export interface AssessmentResultResponse {
  assessmentId: string;
  studentId: string;
  status: AssessmentResult["status"];
  score: number | null;
  maxScore: number;
  percentage: number | null;
  letter: Letter | null;
  late: boolean;
}

export function toAssessmentResultResponse(
  value: AssessmentResult,
): AssessmentResultResponse {
  return {
    assessmentId: value.assessmentId,
    studentId: value.studentId,
    status: value.status,
    score: value.score,
    maxScore: value.maxScore,
    percentage: value.percentage,
    letter: value.letter,
    late: value.late,
  };
}
