import type { Context, MiddlewareHandler } from "hono";

import type { AppEnv } from "./session-middleware";

/**
 * Fixed-window rate limiting for `/api/auth/*`, held in this process's memory.
 *
 * Why it is here at all: `MIN_PASSWORD_LENGTH = 12` was the only brake on
 * online guessing, and argon2id at 64 MiB x 4 lanes makes every attempt cost
 * ~330ms and 64 MiB. This bounds how often attempts may *arrive*.
 *
 * **What it does not do, despite an earlier version of this comment and of
 * web/README.md saying so: bound argon2's memory.** A fixed-window counter has
 * no concurrency semantics whatsoever. "30 requests per minute" is satisfied by
 * 30 requests in the same millisecond, which is ~1.9 GiB of argon2 working
 * memory from one address, inside its allowance, with the limiter working
 * exactly as designed. Bounding *simultaneous* cost takes a concurrency limit,
 * which is now `Semaphore` in `adapters/semaphore.ts`, applied in
 * `Argon2PasswordHasher`. Two controls, two mechanisms:
 *   - this one bounds the arrival rate, which is what frustrates guessing;
 *   - the semaphore bounds the width, which is what bounds memory.
 *
 * Deliberately small and dependency-free. Three independent counters, one per
 * thing worth bounding separately:
 *   - per client IP, across `/api/auth/*`;
 *   - per email address on *login*, which bounds guessing against one account
 *     even when the attempts are spread across many source addresses;
 *   - per email address on *signup*, which is a separate bucket on purpose —
 *     see the note in `routes/auth-routes.ts`. Sharing one bucket let an
 *     attacker spend a registered teacher's login allowance by posting
 *     signups for their address, locking them out of their own account with
 *     no password reset in this chunk to recover.
 *
 * **In-process only.** The counters live in a `Map` in this process, so they
 * reset on restart and are not shared between instances. A multi-instance
 * deployment gets N times the limit and must replace this with a shared store.
 * See web/README.md.
 */

export interface RateLimitRule {
  /** Requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

/**
 * The limits, as named constants so they are easy to argue with. Sized to be
 * invisible to a teacher who mistypes a password a few times and to be useless
 * to a script: 10 attempts per 15 minutes against one address is 40/hour.
 */
export const AUTH_IP_RATE_LIMIT: RateLimitRule = { limit: 30, windowMs: 60_000 };
export const AUTH_EMAIL_RATE_LIMIT: RateLimitRule = { limit: 10, windowMs: 15 * 60_000 };

/**
 * Signup's per-address allowance. The same numbers as login's, but a separate
 * constant for a separate counter, so that the two can never again be one
 * bucket by accident — and so tightening one does not silently tighten the
 * teacher's ability to log in.
 */
export const SIGNUP_EMAIL_RATE_LIMIT: RateLimitRule = { limit: 10, windowMs: 15 * 60_000 };

/** Stop the Map growing without bound if a run of unique keys arrives. */
const MAX_TRACKED_KEYS = 20_000;

interface Window {
  count: number;
  /** Epoch ms at which this window ends and the count resets. */
  resetAt: number;
}

/**
 * One fixed-window counter. `check` is the whole algorithm: find the window,
 * start a new one if the old has elapsed, increment, compare.
 */
export class FixedWindowRateLimiter {
  private readonly windows = new Map<string, Window>();

  constructor(
    private readonly rule: RateLimitRule,
    private readonly now: () => number = Date.now,
  ) {}

  /** `true` when the caller is within its allowance; `false` when it is over. */
  consume(key: string): boolean {
    const at = this.now();
    const existing = this.windows.get(key);

    // Live window: the ordinary path, a single Map lookup and an increment.
    if (existing !== undefined && at < existing.resetAt) {
      existing.count += 1;
      return existing.count <= this.rule.limit;
    }

    // An elapsed window reuses the slot it already holds, so only a key that
    // is not tracked at all has to find room.
    if (existing === undefined && !this.makeRoom(at)) return false;

    this.windows.set(key, { count: 1, resetAt: at + this.rule.windowMs });
    return true;
  }

  /** Seconds until this key's window resets; 0 when it is not being tracked. */
  retryAfterSeconds(key: string): number {
    const window = this.windows.get(key);
    if (window === undefined) return 0;
    return Math.max(0, Math.ceil((window.resetAt - this.now()) / 1000));
  }

  /** Test seam, and what a restart does implicitly. */
  reset(): void {
    this.windows.clear();
  }

  /**
   * Make room for a key that is not tracked yet. `true` when there is room.
   * Only runs on the untracked-key path, so the common case stays a single Map
   * lookup.
   *
   * Elapsed windows are dropped first — they are the reclaimable ones, and in
   * ordinary operation that is all this ever does.
   *
   * If the table is still full, every tracked key has a live window, so this
   * is a flood of distinct keys and not a leak. The answer is `false`, which
   * `consume` turns into a 429 for the *new* key. The previous answer was
   * `this.windows.clear()`, which deleted every counter in the table —
   * including the ones that were over their limit — so the way to get past
   * the limiter was to fill it: a blocked key's next request went straight
   * through. A security control must not have a load level at which it stops
   * enforcing. Refusing an unknown key is the fail-closed choice; evicting the
   * oldest entries instead would be fail-open again, because the oldest entry
   * may be exactly the attacker the limiter is holding back.
   *
   * The cost is real and worth stating: under a flood of 20,000 distinct keys
   * a genuinely new teacher is refused until windows start elapsing. That is a
   * denial of service bounded by `windowMs`, traded against a limiter that can
   * be switched off on demand.
   */
  private makeRoom(at: number): boolean {
    if (this.windows.size < MAX_TRACKED_KEYS) return true;

    for (const [key, window] of this.windows) {
      if (at >= window.resetAt) this.windows.delete(key);
    }

    return this.windows.size < MAX_TRACKED_KEYS;
  }
}

/** The 429, in the same `{error:{code}}` shape every other failure uses. */
export function tooManyRequests(c: Context, retryAfterSeconds: number): Response {
  if (retryAfterSeconds > 0) c.header("Retry-After", String(retryAfterSeconds));
  return c.json({ error: { code: "rate_limited" } }, 429);
}

/**
 * How a request is attributed to a client. Injected rather than read directly
 * from the socket so `createApp` stays transport-agnostic and `app.request()`
 * works in tests.
 *
 * `X-Forwarded-For` is deliberately *not* consulted: nothing in front of this
 * server is trusted to set it, and honouring it would let an attacker reset
 * their own counter with a header.
 */
export type ClientIpResolver = (c: Context<AppEnv>) => string;

/** Per-IP limiting. Cheap: no body is read, so it can run before parsing. */
export function ipRateLimit(
  limiter: FixedWindowRateLimiter,
  clientIp: ClientIpResolver,
): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const key = clientIp(c);
    if (!limiter.consume(key)) return tooManyRequests(c, limiter.retryAfterSeconds(key));
    await next();
  };
}
