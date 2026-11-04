/**
 * Exact decimal helpers for the grading module. Internal to `./grading`;
 * nothing outside that directory imports this file.
 *
 * Why this exists at all: the obvious ways to round a percentage to two
 * decimals are both wrong at the boundary, and the boundary is exactly where a
 * letter grade changes hands.
 *
 *   Math.round(1.005 * 100) / 100  ->  1      (1.005 * 100 is 100.49999999999999)
 *   (1.005).toFixed(2)             ->  "1.00"
 *
 * Both answer 1.00 where round-half-up says 1.01. A teacher told "round half up
 * to two decimals" and then shown 1.00 has been given the wrong number, and the
 * error is not reproducible by hand, which is the worst kind. So the grading
 * module never rounds a float: it divides two integers under an explicit
 * half-up rule and only then produces a `number`.
 */

/**
 * The largest point total exact arithmetic here will accept.
 *
 * Chosen so that the widest intermediate in `percentageOf` — hundredths of a
 * point multiplied by 10 000 — still fits in `Number.MAX_SAFE_INTEGER`. That
 * makes it ~9.0 × 10⁹ points for a single total; a gradebook that large is a
 * corrupt input, not a big class.
 */
const MAX_EXACT_POINTS = Number.MAX_SAFE_INTEGER / 1_000_000;

/** Raised when a score or cutoff is not a value exact arithmetic can accept. */
export class InexactNumberError extends Error {
  constructor(label: string, value: number) {
    super(`${label} must be a finite number with at most 2 decimal places, got ${value}.`);
    this.name = "InexactNumberError";
  }
}

/**
 * A number's exact value as a count of hundredths.
 *
 * Two decimal places is not an arbitrary cap: `max_score`, `score` and the
 * grading cutoffs are all `numeric(_, 2)` columns, so two places is the full
 * precision the database can hold. Anything finer arriving here means a caller
 * computed a value instead of reading one — which is the mistake this module
 * exists to prevent — so it throws rather than quietly rounding and hiding it.
 *
 * Read off the value's own shortest round-tripping decimal form (what
 * `String(x)` gives) rather than by multiplying: `String` is exact for every
 * double that came from a 2-decimal source, and multiplying is not.
 */
export function toHundredths(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new InexactNumberError(label, value);
  if (Math.abs(value) > MAX_EXACT_POINTS) throw new InexactNumberError(label, value);

  // Exponential notation never appears for the magnitudes this module handles,
  // but a caller could still pass 1e-9, and reading "1e-9" as a fixed-point
  // string would take it for 1. Reject it by name rather than misparse it.
  const text = String(value);
  if (text.includes("e") || text.includes("E")) throw new InexactNumberError(label, value);

  const negative = text.startsWith("-");
  const [whole = "", fraction = ""] = (negative ? text.slice(1) : text).split(".");
  if (fraction.length > 2) throw new InexactNumberError(label, value);

  // Pad to exactly two places so the concatenation is a count of hundredths
  // rather than of however many places the caller happened to write.
  const hundredths = Number.parseInt(`${whole}${fraction.padEnd(2, "0")}`, 10);
  return negative ? -hundredths : hundredths;
}

/**
 * Whether the grading module can hold this value exactly.
 *
 * Exported through the module's public surface so input validation can reject a
 * three-decimal score with a 400 that names the field, instead of letting it
 * reach the arithmetic and come back as a 500. It is the same test
 * `toHundredths` applies, asked as a question — not a second copy of the rule.
 */
export function isExactScore(value: number): boolean {
  try {
    toHundredths(value, "score");
    return true;
  } catch {
    return false;
  }
}

/**
 * `numerator / denominator` for non-negative integers, rounded half-up, with no
 * intermediate float value anywhere in the decision.
 *
 * Half-up rather than `Math.round`'s semantics because that is the product
 * decision, and because `Math.round(-0.5)` is `-0` — towards zero — while
 * half-up goes away from it. Grades are never negative so the two agree in
 * practice, but the rule should not quietly depend on that.
 *
 * `Math.floor(numerator / denominator)` is exact here, despite being a float
 * division, because `numerator <= MAX_SAFE_INTEGER`. For the float result to
 * reach `q + 1` the true quotient's gap `1 / denominator` would have to be
 * under half an ULP of `q`, which for `q >= 2^k` requires
 * `denominator > 2^(53-k)` and hence `numerator > 2^53` — excluded by the
 * guard below. The half-up test itself is then pure integer arithmetic.
 */
export function divideRoundHalfUp(numerator: number, denominator: number): number {
  if (!Number.isSafeInteger(numerator) || numerator < 0) {
    throw new Error(`divideRoundHalfUp needs a non-negative safe integer, got ${numerator}.`);
  }
  if (!Number.isSafeInteger(denominator) || denominator <= 0) {
    throw new Error(`divideRoundHalfUp needs a positive safe integer divisor, got ${denominator}.`);
  }

  const quotient = Math.floor(numerator / denominator);
  const remainder = numerator - quotient * denominator;
  // "the fraction is at least one half", decided on integers, so no boundary
  // can be misread the way `x * 100` misreads 1.005.
  return 2 * remainder >= denominator ? quotient + 1 : quotient;
}
