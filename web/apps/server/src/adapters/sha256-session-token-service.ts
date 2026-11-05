import type { SessionTokenService } from "@teacherly/core";
import { createHash, randomBytes } from "node:crypto";

/** 32 bytes = 256 bits of entropy, as required for the cookie token. */
const TOKEN_BYTES = 32;

export class Sha256SessionTokenService implements SessionTokenService {
  generate(): string {
    // base64url so the value is cookie-safe without further encoding.
    return randomBytes(TOKEN_BYTES).toString("base64url");
  }

  hash(token: string): string {
    // Plain SHA-256 is right here and a salted KDF would not be: the input is
    // 256 bits of uniform randomness, so there is no guessable space to slow
    // an attacker down over. What this buys is that a database read yields
    // digests, not usable sessions.
    return createHash("sha256").update(token).digest("hex");
  }
}
