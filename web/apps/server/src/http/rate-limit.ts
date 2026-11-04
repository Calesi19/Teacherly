import type { Context, MiddlewareHandler } from "hono";

import type { AppEnv } from "./session-middleware";

/**
 * Fixed-window rate limiting for `/api/auth/*`, held in this process's memory.
 *
 * Why it is here at all: `MIN_PASSWORD_LENGTH = 12` was the only brake on
 * online guessing, and argon2id at 64 MiB x 4 lanes makes every login attempt
 * cost ~330ms and 64 MiB with no concurrency cap. A few hundred simultaneous
 * attempts exhaust the process long before they exhaust any password, so the
 * missing limiter was a denial-of-service lever as much as a guessing one.
 *
 * Deliberately small and dependency-free. Two independent counters:
 *   - per client IP, which bounds the memory amplification above;
 *   - per email address, which bounds guessing against one account even when
 *     the attempts are spread across many source addresses.
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

    if (existing === undefined || at >= existing.resetAt) {
      this.pruneIfLarge(at);
      this.windows.set(key, { count: 1, resetAt: at + this.rule.windowMs });
      return true;
    }

    existing.count += 1;
    return existing.count <= this.rule.limit;
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
   * Drop elapsed windows when the map has grown large. Only runs on the
   * new-window path, so the common case stays a single Map lookup.
   */
  private pruneIfLarge(at: number): void {
    if (this.windows.size < MAX_TRACKED_KEYS) return;
    for (const [key, window] of this.windows) {
      if (at >= window.resetAt) this.windows.delete(key);
    }
    // Still full of live windows: this is a flood of distinct keys rather than
    // a leak. Drop everything rather than grow without limit.
    if (this.windows.size >= MAX_TRACKED_KEYS) this.windows.clear();
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
