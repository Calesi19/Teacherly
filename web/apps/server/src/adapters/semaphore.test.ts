import { describe, expect, it } from "vitest";

import { Semaphore } from "./semaphore";

/**
 * The control CAL-9 NEW-5 says was missing: the rate limiter was credited with
 * bounding argon2's memory, and a fixed-window counter cannot — "30 per
 * minute" permits 30 at once. These tests are about the *at once*.
 */

/** A promise plus the handle to settle it, so a test can hold tasks open. */
function deferred() {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("Semaphore", () => {
  it("runs no more than its permits at once", async () => {
    const gate = new Semaphore(2);
    const gates = [deferred(), deferred(), deferred(), deferred(), deferred()];
    let running = 0;
    let peak = 0;

    const tasks = gates.map((held) =>
      gate.run(async () => {
        running += 1;
        peak = Math.max(peak, running);
        await held.promise;
        running -= 1;
      }),
    );

    // Let the first arrivals get their permits.
    await Promise.resolve();
    expect(gate.inFlight).toBe(2);
    expect(gate.queued).toBe(3);

    for (const held of gates) held.resolve();
    await Promise.all(tasks);

    // The whole point: five arrivals, two at a time. Unbounded, this is five
    // argon2 hashes and five times 64 MiB.
    expect(peak).toBe(2);
    expect(gate.inFlight).toBe(0);
  });

  it("releases the permit when a task throws", async () => {
    const gate = new Semaphore(1);

    await expect(
      gate.run(() => Promise.reject(new Error("argon2 failed"))),
    ).rejects.toThrow("argon2 failed");

    // A permit leaked on the error path would wedge every later login after
    // the first failure, which is why `run` releases in a `finally`.
    expect(gate.inFlight).toBe(0);
    await expect(gate.run(() => Promise.resolve("ok"))).resolves.toBe("ok");
  });

  it("serves waiters in arrival order", async () => {
    const gate = new Semaphore(1);
    const order: number[] = [];
    const first = deferred();

    const tasks = [
      gate.run(async () => {
        order.push(0);
        await first.promise;
      }),
      gate.run(async () => {
        order.push(1);
      }),
      gate.run(async () => {
        order.push(2);
      }),
    ];

    first.resolve();
    await Promise.all(tasks);

    // FIFO, so a steady stream of new arrivals cannot starve someone already
    // queued — which for a login queue is the difference between slow and
    // never.
    expect(order).toEqual([0, 1, 2]);
  });

  it("refuses a nonsensical width", () => {
    expect(() => new Semaphore(0)).toThrow(/at least one permit/);
    expect(() => new Semaphore(-1)).toThrow(/at least one permit/);
    expect(() => new Semaphore(1.5)).toThrow(/at least one permit/);
  });
});
