import { toHundredths } from "./decimal";
import { fromHundredths, percentageOfHundredths } from "./percentage";
import { letterFor, type GradingScale, type Letter } from "./scale";

/**
 * The grading module. Every percentage and every letter in Teacherly is
 * produced here, from the one rounding path in `./percentage`.
 *
 * The product decisions this encodes, all five of them, so a reader does not
 * have to go and find the ticket:
 *
 *   1. A grade is `sum(score) / sum(max_score)` over non-exempt, scored rows,
 *      as a percentage — *percent of points earned*, not a mean of per-
 *      assessment percentages. A 100-point exam therefore weighs ten times a
 *      10-point quiz.
 *   2. Exempt leaves the numerator *and* the denominator. An exempt assessment
 *      is not a zero and is not a 100; it is not part of the grade at all.
 *   3. Rounding happens exactly once, in `percentageOf`, and the letter is
 *      decided from the rounded number. The screen and the PDF cannot disagree
 *      because there is only one number.
 *   4. `late` is recorded and reported and never scored. It appears in the
 *      result types and in no arithmetic.
 *   5. The cutoffs come from the class, as a `GradingScale`. Nothing here
 *      mentions 90, 80, 70 or 60.
 *
 * A missing grade row and a zero score are different things, and the difference
 * is visible in the types: a zero is `score: 0`, counts for 0 points and puts
 * `max_score` in the denominator; a missing row is `undefined`, counts for
 * nothing and puts nothing in the denominator. Nothing here coerces one to the
 * other — which is the bug a `COALESCE(score, 0)` would be.
 */

/** What grading needs to know about an assessment. */
export interface GradableAssessment {
  readonly id: string;
  readonly maxScore: number;
}

/**
 * What grading needs to know about a recorded grade.
 *
 * `score: null` is a row that exists without a score yet — a teacher who marked
 * something late, or left a note, before marking it. It counts as ungraded, the
 * same as no row, because a scoreless row says nothing about how the student
 * did.
 */
export interface GradableGrade {
  readonly assessmentId: string;
  readonly studentId: string;
  readonly score: number | null;
  readonly exempt: boolean;
  readonly late: boolean;
}

/**
 * Why an assessment does or does not contribute.
 *
 * `"ungraded"` is the one that matters: it is neither a zero nor an exemption,
 * it simply has not been marked. It leaves both sides of the fraction, exactly
 * like `"exempt"` — but the two are reported separately, because "I excused
 * this student" and "I have not got round to this" are different facts about a
 * gradebook and a teacher needs to see which is which.
 */
export type GradeStatus = "graded" | "exempt" | "ungraded";

/** One student on one assessment. */
export interface AssessmentResult {
  readonly assessmentId: string;
  readonly studentId: string;
  readonly status: GradeStatus;
  /** The recorded score, or `null` when there is nothing recorded. */
  readonly score: number | null;
  readonly maxScore: number;
  /** `null` unless `status` is `"graded"`. Never 0 standing in for "no grade". */
  readonly percentage: number | null;
  readonly letter: Letter | null;
  /** Reported, never scored. */
  readonly late: boolean;
}

/**
 * Where a percentage came from.
 *
 * Carried on every aggregate so a caller can show the fraction behind the
 * number — and so a `percentage: null` is self-explaining: `countedAssessments`
 * is 0, and `exempt` plus `ungraded` says why.
 */
export interface GradeTotals {
  readonly pointsEarned: number;
  readonly pointsPossible: number;
  readonly counted: number;
  readonly exempt: number;
  readonly ungraded: number;
}

/** One student's standing in a class. */
export interface StudentClassGrade {
  readonly studentId: string;
  readonly totals: GradeTotals;
  /**
   * `null` when nothing counts — every assessment exempt, or none marked yet,
   * or a class with no assessments. Not 0: a student whose every assessment was
   * excused has no percentage, and calling that 0% gives them an F for having
   * been excused. The desktop app's PDF does exactly that.
   */
  readonly percentage: number | null;
  readonly letter: Letter | null;
}

/** One assessment across a class. */
export interface AssessmentAverage {
  readonly assessmentId: string;
  readonly maxScore: number;
  readonly totals: GradeTotals;
  readonly percentage: number | null;
  readonly letter: Letter | null;
}

/** `assessmentId` -> `studentId` -> grade, built once per aggregate call. */
type GradeIndex = Map<string, Map<string, GradableGrade>>;

function indexGrades(grades: readonly GradableGrade[]): GradeIndex {
  const index: GradeIndex = new Map();
  for (const grade of grades) {
    let forAssessment = index.get(grade.assessmentId);
    if (forAssessment === undefined) {
      forAssessment = new Map();
      index.set(grade.assessmentId, forAssessment);
    }
    // One row per (assessment, student) is a database constraint; if a caller
    // somehow supplies two, the last wins rather than both counting.
    forAssessment.set(grade.studentId, grade);
  }
  return index;
}

function statusOf(grade: GradableGrade | undefined): GradeStatus {
  if (grade === undefined) return "ungraded";
  // Exempt wins over a recorded score: a teacher who scored something and then
  // excused it meant to excuse it, and the score is kept only as a record.
  if (grade.exempt) return "exempt";
  return grade.score === null ? "ungraded" : "graded";
}

/** A mutable accumulator; integers only, so a long sum cannot drift. */
interface Accumulator {
  earned: number;
  possible: number;
  counted: number;
  exempt: number;
  ungraded: number;
}

function newAccumulator(): Accumulator {
  return { earned: 0, possible: 0, counted: 0, exempt: 0, ungraded: 0 };
}

function accumulate(
  into: Accumulator,
  status: GradeStatus,
  score: number | null,
  maxScore: number,
): void {
  if (status === "exempt") {
    into.exempt += 1;
    return;
  }
  if (status === "ungraded" || score === null) {
    into.ungraded += 1;
    return;
  }
  into.counted += 1;
  into.earned += toHundredths(score, "score");
  into.possible += toHundredths(maxScore, "maxScore");
}

function finish(accumulator: Accumulator): { totals: GradeTotals; percentage: number | null } {
  return {
    totals: {
      pointsEarned: fromHundredths(accumulator.earned),
      pointsPossible: fromHundredths(accumulator.possible),
      counted: accumulator.counted,
      exempt: accumulator.exempt,
      ungraded: accumulator.ungraded,
    },
    percentage: percentageOfHundredths(accumulator.earned, accumulator.possible),
  };
}

/** The one place a percentage becomes a percentage-and-letter pair. */
function withLetter(
  scale: GradingScale,
  percentage: number | null,
): { percentage: number | null; letter: Letter | null } {
  return { percentage, letter: percentage === null ? null : letterFor(scale, percentage) };
}

/**
 * One student's result on one assessment.
 *
 * `grade` is `undefined` when no row exists. Note that a single assessment's
 * percentage goes through the same `percentageOf` as a whole class's, so a
 * 17/20 shown on an assessment page and a 17/20 class total round identically.
 */
export function gradeAssessmentForStudent(
  scale: GradingScale,
  assessment: GradableAssessment,
  studentId: string,
  grade: GradableGrade | undefined,
): AssessmentResult {
  const status = statusOf(grade);
  const accumulator = newAccumulator();
  accumulate(accumulator, status, grade?.score ?? null, assessment.maxScore);
  const { percentage, letter } = withLetter(scale, finish(accumulator).percentage);

  return {
    assessmentId: assessment.id,
    studentId,
    status,
    score: grade?.score ?? null,
    maxScore: assessment.maxScore,
    percentage,
    letter,
    late: grade?.late ?? false,
  };
}

/**
 * One student's percentage and letter for a whole class.
 *
 * Every assessment in the class is considered, not only the ones with a row, so
 * `totals.ungraded` is the honest count of what is still outstanding rather
 * than only the rows that happen to exist.
 */
export function gradeClassForStudent(
  scale: GradingScale,
  assessments: readonly GradableAssessment[],
  grades: readonly GradableGrade[],
  studentId: string,
): StudentClassGrade {
  const index = indexGrades(grades);
  const accumulator = newAccumulator();

  for (const assessment of assessments) {
    const grade = index.get(assessment.id)?.get(studentId);
    accumulate(accumulator, statusOf(grade), grade?.score ?? null, assessment.maxScore);
  }

  const { totals, percentage } = finish(accumulator);
  return { studentId, totals, ...withLetter(scale, percentage) };
}

/**
 * Every student's standing in the class, from one pass over the grades.
 *
 * A convenience over `gradeClassForStudent` for the roster endpoint — not a
 * second formula. The indexing is shared rather than rebuilt per student,
 * which is the only difference.
 */
export function gradeClassForStudents(
  scale: GradingScale,
  assessments: readonly GradableAssessment[],
  grades: readonly GradableGrade[],
  studentIds: readonly string[],
): StudentClassGrade[] {
  const index = indexGrades(grades);

  return studentIds.map((studentId) => {
    const accumulator = newAccumulator();
    for (const assessment of assessments) {
      const grade = index.get(assessment.id)?.get(studentId);
      accumulate(accumulator, statusOf(grade), grade?.score ?? null, assessment.maxScore);
    }
    const { totals, percentage } = finish(accumulator);
    return { studentId, totals, ...withLetter(scale, percentage) };
  });
}

/**
 * The class average on one assessment.
 *
 * `studentIds` is the roster, so a student with no row counts as ungraded
 * rather than being invisible. Because every student shares the assessment's
 * `max_score`, `sum(score) / (counted × max_score)` is also the mean of the
 * individual percentages — the class average and the per-student percentages
 * are the same formula, which is why they can never tell different stories.
 */
export function averageForAssessment(
  scale: GradingScale,
  assessment: GradableAssessment,
  grades: readonly GradableGrade[],
  studentIds: readonly string[],
): AssessmentAverage {
  const forAssessment = indexGrades(grades).get(assessment.id);
  const accumulator = newAccumulator();

  for (const studentId of studentIds) {
    const grade = forAssessment?.get(studentId);
    accumulate(accumulator, statusOf(grade), grade?.score ?? null, assessment.maxScore);
  }

  const { totals, percentage } = finish(accumulator);
  return {
    assessmentId: assessment.id,
    maxScore: assessment.maxScore,
    totals,
    ...withLetter(scale, percentage),
  };
}

/** Every student's result on one assessment, plus the class average. */
export interface AssessmentReport {
  readonly average: AssessmentAverage;
  readonly results: readonly AssessmentResult[];
}

export function reportForAssessment(
  scale: GradingScale,
  assessment: GradableAssessment,
  grades: readonly GradableGrade[],
  studentIds: readonly string[],
): AssessmentReport {
  const forAssessment = indexGrades(grades).get(assessment.id);
  return {
    average: averageForAssessment(scale, assessment, grades, studentIds),
    results: studentIds.map((studentId) =>
      gradeAssessmentForStudent(scale, assessment, studentId, forAssessment?.get(studentId)),
    ),
  };
}
