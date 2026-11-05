import { ValidationError, type ValidationIssue } from "../domain/errors";
import { toHundredths } from "./decimal";
import { percentageHundredths } from "./percentage";

/** The five bands. Ordered best to worst; `F` has no cutoff of its own. */
export const LETTERS = ["A", "B", "C", "D", "F"] as const;
export type Letter = (typeof LETTERS)[number];

/** The four bands a cutoff is stored for. `F` is "everything below D". */
export const CUTOFF_LETTERS = ["a", "b", "c", "d"] as const;
export type CutoffLetter = (typeof CUTOFF_LETTERS)[number];

/**
 * A class's A–F cutoffs, as the lowest percentage that still earns each letter.
 *
 * A *value*, not a bag of numbers: the only way to get one is
 * `createGradingScale`, so by the time a scale reaches the grading functions it
 * is already known to be ordered, non-overlapping and to cover 0–100. The
 * grading functions therefore contain no validation of their own and cannot be
 * handed a scale where, say, B is above A.
 *
 * `readonly` on each field so a holder cannot edit a validated scale back into
 * an invalid one after the fact.
 */
export interface GradingScale {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
}

/**
 * What a new class gets. The user's decision: 90/80/70/60 is the default, not
 * the rule — every class carries its own and may change it. The desktop app
 * hard-codes these same four numbers in six separate places, which is why
 * changing a class's scale there is not a feature anyone can add.
 */
export const DEFAULT_GRADING_SCALE: GradingScale = { a: 90, b: 80, c: 70, d: 60 };

export interface GradingScaleInput {
  a?: number | undefined;
  b?: number | undefined;
  c?: number | undefined;
  d?: number | undefined;
}

/**
 * Validate and construct a scale. Throws `ValidationError` with one issue per
 * bad field, so an API caller gets told which cutoff is wrong rather than just
 * that something is.
 *
 * The four rules, which together are "bands ordered, non-overlapping, covering
 * 0–100":
 *   1. each cutoff is a number with at most 2 decimals — the precision the
 *      `numeric(5, 2)` columns can actually store;
 *   2. each cutoff is within 0–100 inclusive;
 *   3. A > B > C > D, strictly — equal cutoffs would make one band empty and
 *      leave two letters claiming the same percentage;
 *   4. D > 0, so F is a band that can be earned rather than a dead letter, and
 *      A <= 100 so the A band is reachable.
 *
 * With 3 and 4 holding, [0, D) [D, C) [C, B) [B, A) [A, ∞) partition the whole
 * range with no gap and no overlap, and every percentage 0–100 lands in exactly
 * one of them. That is the covering property, and it is a consequence of the
 * ordering rather than a separate check.
 *
 * Fields are optional on input: an omitted cutoff takes the default, so
 * `createGradingScale({})` is the 90/80/70/60 scale and a caller that wants to
 * move only the A cutoff says only that.
 */
export function createGradingScale(input: GradingScaleInput = {}): GradingScale {
  const issues: ValidationIssue[] = [];
  const resolved: Record<CutoffLetter, number> = { ...DEFAULT_GRADING_SCALE };

  for (const letter of CUTOFF_LETTERS) {
    const raw = input[letter];
    if (raw === undefined) continue;

    const field = `gradingScale.${letter}`;
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      issues.push({ field, code: "required" });
      continue;
    }
    try {
      toHundredths(raw, field);
    } catch {
      issues.push({ field, code: "too_precise" });
      continue;
    }
    if (raw < 0 || raw > 100) {
      issues.push({ field, code: "out_of_range" });
      continue;
    }
    resolved[letter] = raw;
  }

  // Only check the ordering once every individual cutoff is known to be a
  // sane number — otherwise a single garbage value reports as four problems.
  if (issues.length === 0) {
    if (!(resolved.a > resolved.b && resolved.b > resolved.c && resolved.c > resolved.d)) {
      issues.push({ field: "gradingScale", code: "not_descending" });
    } else if (resolved.d <= 0) {
      // Strictly above zero: at D = 0 the F band is [0, 0), which no score can
      // land in, so the class would have a letter nobody can be given.
      issues.push({ field: "gradingScale.d", code: "out_of_range" });
    }
  }

  if (issues.length > 0) throw new ValidationError(issues);
  return { a: resolved.a, b: resolved.b, c: resolved.c, d: resolved.d };
}

/**
 * The letter for an already-rounded percentage.
 *
 * Takes the output of `percentageOf` and nothing else. Passing a raw ratio
 * would reintroduce the disagreement this module exists to remove: 89.995 is a
 * B unrounded and an A rounded, and the screen and the PDF must not be able to
 * pick different ones.
 *
 * Compared as integer hundredths rather than as floats, so the cutoff boundary
 * is decided exactly — a percentage of exactly 90 is an A, and no
 * representation error can make it 89.99999999999999 instead.
 */
export function letterFor(scale: GradingScale, roundedPercentage: number): Letter {
  const value = percentageHundredths(roundedPercentage);
  if (value >= percentageHundredths(scale.a)) return "A";
  if (value >= percentageHundredths(scale.b)) return "B";
  if (value >= percentageHundredths(scale.c)) return "C";
  if (value >= percentageHundredths(scale.d)) return "D";
  return "F";
}
