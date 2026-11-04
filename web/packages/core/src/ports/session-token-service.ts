/**
 * Session token minting and hashing, kept behind a port so `packages/core`
 * never imports `node:crypto` and so tests can make tokens deterministic.
 */
export interface SessionTokenService {
  /** A fresh opaque token with at least 256 bits of entropy. */
  generate(): string;

  /** A stable, one-way digest of a token. SHA-256 in the real implementation. */
  hash(token: string): string;
}
