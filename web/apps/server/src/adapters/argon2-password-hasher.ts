import type { PasswordHasher } from "@teacherly/core";
import argon2 from "argon2";
import { randomBytes } from "node:crypto";

import { Semaphore } from "./semaphore";

/**
 * argon2id, using node-argon2's own current defaults rather than numbers we
 * invented: memoryCost 65536 KiB (64 MiB), timeCost 3, parallelism 4,
 * hashLength 32, saltLength 16, version 0x13. Only `type` is passed explicitly,
 * so the intent is visible in the code and the cost parameters keep tracking
 * the library's recommendation when it is upgraded.
 */
const HASH_OPTIONS = { type: argon2.argon2id } as const;

/**
 * How many argon2id operations may be in flight at once, across the process.
 *
 * This is the control that actually bounds argon2's memory, and it did not
 * exist: the rate limiter was credited with it, but a fixed-window counter
 * permits its whole allowance simultaneously, so 30 requests/minute/IP allowed
 * 30 x 64 MiB at the same instant. Four is `p=4`'s worth of parallelism and
 * ~256 MiB of peak hashing memory; past that, more concurrency buys no
 * throughput — argon2 is already using four threads per hash — and only raises
 * the resident high-water mark.
 *
 * Hashes beyond the limit *wait* rather than fail. Waiting is the right answer
 * for a teacher logging in during a busy moment, and the rate limiter in front
 * is what stops the queue being fed without bound.
 */
export const MAX_CONCURRENT_HASHES = 4;

export class Argon2PasswordHasher implements PasswordHasher {
  /**
   * Shared by `hash` and `verify`: both run the same memory-hard function, so
   * a cap that counted only one of them would not bound anything. Login is a
   * `verify`, signup is a `hash`, and a flood of either is the same 64 MiB.
   */
  private readonly gate: Semaphore;

  constructor(maxConcurrent: number = MAX_CONCURRENT_HASHES) {
    this.gate = new Semaphore(maxConcurrent);
  }

  async hash(plaintext: string): Promise<string> {
    return this.gate.run(() => argon2.hash(plaintext, HASH_OPTIONS));
  }

  async verify(storedHash: string, plaintext: string): Promise<boolean> {
    return this.gate.run(async () => {
      try {
        return await argon2.verify(storedHash, plaintext);
      } catch {
        // A malformed or truncated stored hash makes argon2.verify throw. Treat
        // it as a failed password so a corrupt row is indistinguishable from a
        // wrong guess and cannot be probed for.
        return false;
      }
    });
  }
}

/**
 * A real argon2id hash of a value nobody will ever know, minted fresh per
 * process. The login path verifies against this when an email has no account,
 * so the unknown-email branch does the same work as the wrong-password branch.
 */
export async function createDecoyPasswordHash(hasher: PasswordHasher): Promise<string> {
  return hasher.hash(randomBytes(32).toString("base64url"));
}
