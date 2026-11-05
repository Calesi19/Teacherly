import { describe, expect, it } from "vitest";

import { FixedWindowRateLimiter, type RateLimitRule } from "./rate-limit";

/**
 * The limiter on its own, away from HTTP, because the defect worth covering is
 * in its bookkeeping rather than in a route.
 *
 * `MAX_TRACKED_KEYS` is 20,000 and not injectable, so the "table is full"
 * tests fill it for real. That is 20,000 Map inserts, which is fast, and the
 * alternative — a constructor parameter nothing in production sets — would be
 * a seam that lets the tested configuration drift from the shipped one.
 */

const RULE: RateLimitRule = { limit: 3, windowMs: 60_000 };
const MAX_TRACKED_KEYS = 20_000;

/** A clock the test moves by hand; `Date.now` would make this flaky. */
function fixedClock(start = 1_000_000) {
  let now = start;
  return {
    now: () => now,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe("FixedWindowRateLimiter", () => {
  it("allows up to the limit and refuses after it", () => {
    const clock = fixedClock();
    const limiter = new FixedWindowRateLimiter(RULE, clock.now);

    expect([1, 2, 3, 4, 5].map(() => limiter.consume("a"))).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
  });

  it("starts a fresh window once the old one has elapsed", () => {
    const clock = fixedClock();
    const limiter = new FixedWindowRateLimiter(RULE, clock.now);

    while (limiter.consume("a")) {
      /* spend the allowance */
    }
    clock.advance(RULE.windowMs);

    expect(limiter.consume("a")).toBe(true);
  });

  it("reports the seconds left on a window", () => {
    const clock = fixedClock();
    const limiter = new FixedWindowRateLimiter(RULE, clock.now);

    limiter.consume("a");
    clock.advance(15_000);

    expect(limiter.retryAfterSeconds("a")).toBe(45);
    expect(limiter.retryAfterSeconds("never-seen")).toBe(0);
  });

  it("keeps enforcing against a blocked key when the table fills up", () => {
    // CAL-9 NEW-4. `pruneIfLarge` called `this.windows.clear()` when the map
    // was full of *live* windows, which erased every counter in the table —
    // including the ones that were over their limit. So the way past the
    // limiter was to fill it: a blocked key's very next request went through.
    // A control that stops enforcing under load is worse than no control,
    // because the load is attacker-chosen.
    const clock = fixedClock();
    const limiter = new FixedWindowRateLimiter(RULE, clock.now);

    const blocked = "attacker";
    while (limiter.consume(blocked)) {
      /* spend the allowance */
    }
    expect(limiter.consume(blocked)).toBe(false);

    // Fill the table with live windows from distinct keys.
    for (let i = 0; i < MAX_TRACKED_KEYS + 10; i += 1) {
      limiter.consume(`flood-${i}`);
    }

    // The counter that mattered is still there, and still over.
    expect(limiter.consume(blocked)).toBe(false);
  });

  it("refuses an unknown key rather than wiping enforcement, and recovers", () => {
    const clock = fixedClock();
    const limiter = new FixedWindowRateLimiter(RULE, clock.now);

    for (let i = 0; i < MAX_TRACKED_KEYS; i += 1) {
      limiter.consume(`flood-${i}`);
    }

    // Fail closed: there is no room to track this key, so it is refused. The
    // cost, stated in the source: a genuinely new caller waits out a window.
    expect(limiter.consume("newcomer")).toBe(false);

    // Not permanent. Once the flood's windows elapse they are reclaimed, and
    // the same key is served.
    clock.advance(RULE.windowMs);
    expect(limiter.consume("newcomer")).toBe(true);
  });

  it("lets a key with an elapsed window through even when the table is full", () => {
    const clock = fixedClock();
    const limiter = new FixedWindowRateLimiter(RULE, clock.now);

    limiter.consume("regular");
    // Everything else arrives half a window later, so "regular" elapses first.
    clock.advance(RULE.windowMs / 2);
    for (let i = 0; i < MAX_TRACKED_KEYS; i += 1) {
      limiter.consume(`flood-${i}`);
    }
    clock.advance(RULE.windowMs / 2);

    // An already-tracked key reuses the slot it holds, so a full table does
    // not refuse a returning caller — only an unknown one.
    expect(limiter.consume("regular")).toBe(true);
  });

  it("counts each key separately", () => {
    const clock = fixedClock();
    const limiter = new FixedWindowRateLimiter(RULE, clock.now);

    while (limiter.consume("a")) {
      /* spend a's allowance */
    }

    expect(limiter.consume("b")).toBe(true);
  });
});
