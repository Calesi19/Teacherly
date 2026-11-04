import { ValidationError, type ValidationIssue } from "../domain/errors";
import type {
  AssessmentUpdate,
  ClassUpdate,
  GradeEntry,
  NewAssessment,
  NewClass,
  NewStudent,
  StudentUpdate,
} from "../domain/school";
import { createGradingScale, isExactScore, type GradingScaleInput } from "../grading";

export const MAX_NAME_LENGTH = 120;
export const MAX_COURSE_NAME_LENGTH = 120;
export const MAX_STUDENT_NUMBER_LENGTH = 40;

/**
 * Upper bound on an assessment's `max_score` and on a recorded `score`. Not a
 * pedagogical limit — it is the precision guarantee: `numeric(10, 2)` holds
 * eight digits before the point, and the exact arithmetic in the grading module
 * needs its inputs and their sums to stay representable. A million points is
 * far past any real assessment, extra credit included.
 */
export const MAX_SCORE_LIMIT = 1_000_000;

/** `YYYY-MM-DD`, and a real date — `2026-02-30` matches the shape and is not one. */
const DATE_SHAPE = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;

interface Validated<T> {
  value: T;
  issues: ValidationIssue[];
}

function checkName(raw: unknown, field: string, max: number, issues: ValidationIssue[]): string {
  if (typeof raw !== "string") {
    issues.push({ field, code: "required" });
    return "";
  }
  const name = raw.trim();
  if (name.length === 0) issues.push({ field, code: "required" });
  else if (name.length > max) issues.push({ field, code: "too_long" });
  return name;
}

/**
 * An optional free-text field. Absent and blank both mean `null`, so a cleared
 * input box and an omitted key cannot produce two different stored values.
 */
function checkOptionalText(
  raw: unknown,
  field: string,
  max: number,
  issues: ValidationIssue[],
): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") {
    issues.push({ field, code: "invalid_format" });
    return null;
  }
  const text = raw.trim();
  if (text.length === 0) return null;
  if (text.length > max) issues.push({ field, code: "too_long" });
  return text;
}

/**
 * A score-shaped number: finite, non-negative, at most two decimals.
 *
 * The two-decimal rule is enforced here rather than left to the grading
 * module's `InexactNumberError`, so a bad request is a 400 describing the
 * field and not a 500 from arithmetic. The grading module keeps its own check
 * as a backstop for values that reach it another way.
 */
function checkScoreNumber(
  raw: unknown,
  field: string,
  issues: ValidationIssue[],
): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    issues.push({ field, code: "required" });
    return undefined;
  }
  if (raw < 0) {
    issues.push({ field, code: "out_of_range" });
    return undefined;
  }
  if (raw > MAX_SCORE_LIMIT) {
    issues.push({ field, code: "out_of_range" });
    return undefined;
  }
  // Two decimals is the full precision of the `numeric(10, 2)` column, so a
  // third would be silently dropped on the way to the database and the stored
  // grade would not be the one the teacher typed. Asked of the grading module
  // rather than reimplemented, so there is one definition of "exact".
  if (!isExactScore(raw)) {
    issues.push({ field, code: "too_precise" });
    return undefined;
  }
  return raw;
}

function checkAssignedOn(raw: unknown, issues: ValidationIssue[]): string {
  if (typeof raw !== "string" || raw.length === 0) {
    issues.push({ field: "assignedOn", code: "required" });
    return "";
  }
  if (!DATE_SHAPE.test(raw)) {
    issues.push({ field: "assignedOn", code: "invalid_format" });
    return raw;
  }
  // The shape admits 2026-02-30 and 2025-02-29. Round-tripping through a UTC
  // Date is the cheapest way to ask the calendar rather than the regex.
  const parsed = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw) {
    issues.push({ field: "assignedOn", code: "invalid_format" });
  }
  return raw;
}

function checkBoolean(raw: unknown, field: string, issues: ValidationIssue[]): boolean {
  if (raw === undefined || raw === null) return false;
  if (typeof raw !== "boolean") {
    issues.push({ field, code: "invalid_format" });
    return false;
  }
  return raw;
}

/**
 * Pull a grading-scale input out of an untrusted body. Non-numbers are passed
 * through as-is so `createGradingScale` is the single place that decides what a
 * valid cutoff is, rather than this function having an opinion too.
 */
function readScaleInput(raw: unknown): GradingScaleInput | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "object") return { a: Number.NaN };
  const source = raw as Record<string, unknown>;
  const pick = (key: string): number | undefined =>
    source[key] === undefined ? undefined : (source[key] as number);
  return { a: pick("a"), b: pick("b"), c: pick("c"), d: pick("d") };
}

/** Run `createGradingScale` and fold its issues in rather than throwing early. */
function foldScale<T>(
  raw: unknown,
  issues: ValidationIssue[],
  apply: (scale: ReturnType<typeof createGradingScale>) => T,
): T | undefined {
  const input = readScaleInput(raw);
  if (input === undefined) return undefined;
  try {
    return apply(createGradingScale(input));
  } catch (error) {
    if (error instanceof ValidationError) issues.push(...error.issues);
    else throw error;
    return undefined;
  }
}

function settle<T>(result: Validated<T>): T {
  if (result.issues.length > 0) throw new ValidationError(result.issues);
  return result.value;
}

/* ------------------------------------------------------------------ classes */

export function validateNewClass(body: Record<string, unknown>): NewClass {
  const issues: ValidationIssue[] = [];
  const name = checkName(body["name"], "name", MAX_NAME_LENGTH, issues);
  const courseName = checkName(body["courseName"], "courseName", MAX_COURSE_NAME_LENGTH, issues);
  // Omitted entirely is the common case and means "the default scale", which is
  // the user's decision: a new class gets 90/80/70/60 and may change it later.
  const scale = foldScale(body["gradingScale"], issues, (value) => value) ?? createGradingScale();

  return settle({ value: { name, courseName, gradingScale: scale }, issues });
}

export function validateClassUpdate(body: Record<string, unknown>): ClassUpdate {
  const issues: ValidationIssue[] = [];
  const update: ClassUpdate = {};

  if (body["name"] !== undefined) {
    update.name = checkName(body["name"], "name", MAX_NAME_LENGTH, issues);
  }
  if (body["courseName"] !== undefined) {
    update.courseName = checkName(
      body["courseName"],
      "courseName",
      MAX_COURSE_NAME_LENGTH,
      issues,
    );
  }
  if (body["gradingScale"] !== undefined) {
    // A partial scale is merged against the *defaults*, not against the class's
    // current scale, so the same request body always produces the same scale.
    // Moving one cutoff relative to the stored ones means sending all four.
    const scale = foldScale(body["gradingScale"], issues, (value) => value);
    if (scale !== undefined) update.gradingScale = scale;
  }

  if (Object.keys(update).length === 0 && issues.length === 0) {
    issues.push({ field: "body", code: "empty_update" });
  }
  return settle({ value: update, issues });
}

/* ----------------------------------------------------------------- students */

export function validateNewStudent(
  classId: string,
  body: Record<string, unknown>,
): NewStudent {
  const issues: ValidationIssue[] = [];
  const name = checkName(body["name"], "name", MAX_NAME_LENGTH, issues);
  const studentNumber = checkOptionalText(
    body["studentNumber"],
    "studentNumber",
    MAX_STUDENT_NUMBER_LENGTH,
    issues,
  );
  return settle({ value: { classId, name, studentNumber }, issues });
}

export function validateStudentUpdate(body: Record<string, unknown>): StudentUpdate {
  const issues: ValidationIssue[] = [];
  const update: StudentUpdate = {};

  if (body["name"] !== undefined) {
    update.name = checkName(body["name"], "name", MAX_NAME_LENGTH, issues);
  }
  // `null` is a meaningful value here — "clear the student number" — so the
  // presence check uses `in` rather than `!== undefined`.
  if ("studentNumber" in body) {
    update.studentNumber = checkOptionalText(
      body["studentNumber"],
      "studentNumber",
      MAX_STUDENT_NUMBER_LENGTH,
      issues,
    );
  }

  if (Object.keys(update).length === 0 && issues.length === 0) {
    issues.push({ field: "body", code: "empty_update" });
  }
  return settle({ value: update, issues });
}

/* -------------------------------------------------------------- assessments */

export function validateNewAssessment(
  classId: string,
  body: Record<string, unknown>,
): NewAssessment {
  const issues: ValidationIssue[] = [];
  const name = checkName(body["name"], "name", MAX_NAME_LENGTH, issues);
  const maxScore = checkScoreNumber(body["maxScore"], "maxScore", issues);
  // Zero would make the assessment contribute nothing to any denominator while
  // still looking like a graded item, so it is rejected at the door rather than
  // handled as a special case in the formula.
  if (maxScore !== undefined && maxScore <= 0) {
    issues.push({ field: "maxScore", code: "out_of_range" });
  }
  const assignedOn = checkAssignedOn(body["assignedOn"], issues);

  return settle({
    value: { classId, name, maxScore: maxScore ?? 0, assignedOn },
    issues,
  });
}

export function validateAssessmentUpdate(body: Record<string, unknown>): AssessmentUpdate {
  const issues: ValidationIssue[] = [];
  const update: AssessmentUpdate = {};

  if (body["name"] !== undefined) {
    update.name = checkName(body["name"], "name", MAX_NAME_LENGTH, issues);
  }
  if (body["maxScore"] !== undefined) {
    const maxScore = checkScoreNumber(body["maxScore"], "maxScore", issues);
    if (maxScore !== undefined && maxScore <= 0) {
      issues.push({ field: "maxScore", code: "out_of_range" });
    } else if (maxScore !== undefined) {
      update.maxScore = maxScore;
    }
  }
  if (body["assignedOn"] !== undefined) {
    update.assignedOn = checkAssignedOn(body["assignedOn"], issues);
  }

  if (Object.keys(update).length === 0 && issues.length === 0) {
    issues.push({ field: "body", code: "empty_update" });
  }
  return settle({ value: update, issues });
}

/* ------------------------------------------------------------------- grades */

/**
 * A recorded grade.
 *
 * `score` is nullable on purpose and the three shapes are distinct:
 *   - `{"score": 17}`   — a 17.
 *   - `{"score": 0}`    — a zero. Counts; earns nothing.
 *   - `{"score": null}` — no score yet. Does not count at all. Keeping this
 *     separate from the zero is the whole reason the field is nullable, and
 *     clearing the grade entirely (`DELETE`) is a third, equivalent-for-grading
 *     state that differs only in whether a row exists to hang `late` on.
 *
 * `score > maxScore` is allowed, and that is a decision rather than an
 * oversight: extra credit is real, a teacher who marks 21/20 means it, and a
 * cap here would silently rewrite their intent. The percentage then exceeds
 * 100, which `letterFor` already handles — anything at or above the A cutoff
 * is an A.
 */
export function validateGradeEntry(body: Record<string, unknown>): GradeEntry {
  const issues: ValidationIssue[] = [];

  let score: number | null = null;
  const rawScore = body["score"];
  if (rawScore !== undefined && rawScore !== null) {
    score = checkScoreNumber(rawScore, "score", issues) ?? null;
  }

  const exempt = checkBoolean(body["exempt"], "exempt", issues);
  const late = checkBoolean(body["late"], "late", issues);

  return settle({ value: { score, exempt, late }, issues });
}
