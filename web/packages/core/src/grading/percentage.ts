import { divideRoundHalfUp, toHundredths } from "./decimal";

/** How many decimal places a Teacherly percentage has. One place, one answer. */
export const PERCENTAGE_DECIMALS = 2;

/**
 * THE rounding decision in Teacherly. There is no other one.
 *
 * `points earned / points possible`, as a percentage, at full precision, then
 * rounded half-up to two decimals — once. The number this returns is the number
 * the screen shows, the number the PDF prints, and the number the letter band
 * is decided from. Nothing downstream rounds again, and nothing downstream
 * works from the unrounded ratio, which is the only way the screen and the
 * report can be guaranteed to agree.
 *
 * `null` for an empty denominator. See `GradeTotals` for what that means: it is
 * "no percentage exists", not "zero percent". Returning 0 here is how a student
 * whose every assessment is exempt ends up with an F in a gradebook.
 */
export function percentageOf(pointsEarned: number, pointsPossible: number): number | null {
  return percentageOfHundredths(
    toHundredths(pointsEarned, "pointsEarned"),
    toHundredths(pointsPossible, "pointsPossible"),
  );
}

/**
 * The same calculation over point totals already expressed in hundredths.
 *
 * This is the form the gradebook actually uses: summing `score` values as
 * floats would make a 40-assessment total depend on the order the rows came
 * back in, so totals are accumulated as integers and only ever converted back
 * at the edge. `percentageOf` is the two-argument convenience over it, not a
 * second implementation — there is one `divideRoundHalfUp` call in the codebase
 * that produces a percentage, and it is here.
 */
export function percentageOfHundredths(
  earnedHundredths: number,
  possibleHundredths: number,
): number | null {
  if (possibleHundredths <= 0) return null;
  if (earnedHundredths < 0) {
    throw new Error(`pointsEarned must not be negative, got ${earnedHundredths / 100}.`);
  }

  // Both are counts of hundredths, so their ratio is the ratio of the original
  // values. × 10 000 turns that ratio into hundredths of a percent (× 100 for
  // "percent", × 100 again for "two decimals"); the division is the single
  // rounding step, and the `/ 100` after it is exact.
  return divideRoundHalfUp(earnedHundredths * 10_000, possibleHundredths) / 100;
}

/** A hundredths count back to points. Exact — never a second rounding. */
export function fromHundredths(hundredths: number): number {
  return hundredths / 100;
}

/**
 * The same value as the exact integer count of hundredths of a percent.
 *
 * Used for the letter-band comparison. Comparing the rounded `number` against a
 * cutoff directly would reintroduce float comparison at precisely the point the
 * rounding was supposed to settle; comparing integers cannot go wrong. Exact
 * because `percentageOf` only ever returns `q / 100` for an integer `q`, and
 * `toHundredths` reads that back as `q`.
 */
export function percentageHundredths(percentage: number): number {
  return toHundredths(percentage, "percentage");
}
