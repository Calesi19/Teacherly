/**
 * A counting semaphore, for bounding how many of something run *at once*.
 *
 * Added because the rate limiter was described as doing this and cannot. A
 * fixed-window counter answers "how many requests in the last minute"; it has
 * no concurrency semantics at all, so 30 requests per minute per IP permits 30
 * requests in the same millisecond, and with argon2id at 64 MiB each that is
 * ~1.9 GiB of resident memory from one address inside one window. Rate
 * limiting bounds the *arrival rate*; this bounds the *simultaneous cost*.
 * They are two controls, and the comment that claimed the first delivered the
 * second is corrected in `http/rate-limit.ts` and in web/README.md.
 *
 * Deliberately small and dependency-free, like the limiter. No timeout and no
 * queue bound: callers wait, and what stops the queue growing without limit is
 * the rate limiter in front of it. That ordering is the design — cheap
 * admission control first, expensive work behind a width limit.
 */
export class Semaphore {
  private available: number;
  private held = 0;
  /** FIFO, so a waiter cannot be starved by later arrivals. */
  private readonly waiting: (() => void)[] = [];

  constructor(permits: number) {
    if (!Number.isInteger(permits) || permits < 1) {
      throw new Error(`Semaphore needs at least one permit, got ${permits}.`);
    }
    this.available = permits;
  }

  /** Run `task` holding a permit, releasing it however the task ends. */
  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  /** Permits currently held, i.e. tasks actually running. Test seam. */
  get inFlight(): number {
    return this.held;
  }

  /** Callers currently queued for a permit. Test seam. */
  get queued(): number {
    return this.waiting.length;
  }

  private acquire(): Promise<void> {
    if (this.available > 0) {
      this.available -= 1;
      this.held += 1;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.waiting.push(() => {
        this.held += 1;
        resolve();
      });
    });
  }

  private release(): void {
    this.held -= 1;
    const next = this.waiting.shift();
    // Hand the permit straight to the next waiter rather than returning it to
    // the pool, so a burst of arrivals cannot overtake someone already queued.
    if (next !== undefined) next();
    else this.available += 1;
  }
}
