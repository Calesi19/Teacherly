import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Signup is invite-only. One shared code, `SIGNUP_INVITE_CODE`, from the
 * environment.
 *
 * Why this and not email verification: the account-squatting hole was that
 * signup is a write that anybody could perform. Because signup's response is
 * uniform whether or not the address was taken, probing an address *registers*
 * it, which is a durable denial of registration against a real teacher and
 * needs no credentials at all. Proof of address control (a verification email)
 * is the general fix and needs an email provider this PoC does not have; a
 * shared code needs nothing and removes the "anybody" from the sentence above.
 *
 * It is not a per-teacher secret and does not pretend to be: everyone invited
 * holds the same string, and anyone holding it can still squat addresses. What
 * it buys is that the set of people who can is the set of people the school
 * handed the code to. Email verification and password reset stay out of scope,
 * and are the prerequisite for reopening signup to the public.
 */
export type InviteCodeVerdict = "accepted" | "rejected" | "disabled";

export type InviteCodeCheck = (supplied: string) => InviteCodeVerdict;

/**
 * Compare by digest rather than by `===`.
 *
 * `===` on strings returns as soon as two bytes differ, so the time it takes
 * is a function of how many leading characters the caller got right — enough,
 * over many requests, to recover the code one character at a time. Hashing
 * both sides first makes the comparison fixed-length, which also means a wrong
 * code of the wrong *length* costs the same as a wrong code of the right one;
 * `timingSafeEqual` throws on mismatched lengths and would otherwise need the
 * length checked first, which is itself a leak.
 */
function constantTimeEquals(a: string, b: string): boolean {
  const left = createHash("sha256").update(a, "utf8").digest();
  const right = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(left, right);
}

/**
 * Build the check from the configured value.
 *
 * Fail closed: an unset or empty `SIGNUP_INVITE_CODE` disables signup rather
 * than falling back to the open behaviour. A deployment that forgets the
 * variable refuses to register anyone, which is a visible, recoverable
 * mistake; the other way round, the mistake is invisible and the damage —
 * registered addresses belonging to real teachers — is not undoable from
 * config.
 */
export function inviteCodeChecker(configured: string | undefined): InviteCodeCheck {
  const expected = configured?.trim() ?? "";
  if (expected.length === 0) return () => "disabled";
  return (supplied) => (constantTimeEquals(expected, supplied) ? "accepted" : "rejected");
}
