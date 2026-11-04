import type { PasswordHasher } from "@teacherly/core";
import argon2 from "argon2";
import { randomBytes } from "node:crypto";

/**
 * argon2id, using node-argon2's own current defaults rather than numbers we
 * invented: memoryCost 65536 KiB (64 MiB), timeCost 3, parallelism 4,
 * hashLength 32, saltLength 16, version 0x13. Only `type` is passed explicitly,
 * so the intent is visible in the code and the cost parameters keep tracking
 * the library's recommendation when it is upgraded.
 */
const HASH_OPTIONS = { type: argon2.argon2id } as const;

export class Argon2PasswordHasher implements PasswordHasher {
  async hash(plaintext: string): Promise<string> {
    return argon2.hash(plaintext, HASH_OPTIONS);
  }

  async verify(storedHash: string, plaintext: string): Promise<boolean> {
    try {
      return await argon2.verify(storedHash, plaintext);
    } catch {
      // A malformed or truncated stored hash makes argon2.verify throw. Treat
      // it as a failed password so a corrupt row is indistinguishable from a
      // wrong guess and cannot be probed for.
      return false;
    }
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
