/**
 * The grading module's public surface.
 *
 * `toHundredths` and `divideRoundHalfUp` are deliberately *not* re-exported:
 * they are how this module rounds, and handing them out would let a caller
 * build a second rounding path that merely looked consistent with this one.
 * `isExactScore` is the one piece of `./decimal` that leaves, because input
 * validation has to be able to reject a three-decimal score before the
 * arithmetic sees it. `pnpm check:core-purity` enforces the same rule
 * textually, for the `Math.round` calls a module boundary cannot stop.
 */
export { isExactScore } from "./decimal";
export { PERCENTAGE_DECIMALS, percentageOf } from "./percentage";
export {
  CUTOFF_LETTERS,
  DEFAULT_GRADING_SCALE,
  LETTERS,
  createGradingScale,
  letterFor,
  type CutoffLetter,
  type GradingScale,
  type GradingScaleInput,
  type Letter,
} from "./scale";
export {
  averageForAssessment,
  gradeAssessmentForStudent,
  gradeClassForStudent,
  gradeClassForStudents,
  reportForAssessment,
  type AssessmentAverage,
  type AssessmentReport,
  type AssessmentResult,
  type GradableAssessment,
  type GradableGrade,
  type GradeStatus,
  type GradeTotals,
  type StudentClassGrade,
} from "./grading";
