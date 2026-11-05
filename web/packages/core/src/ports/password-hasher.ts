/**
 * Password hashing, kept behind a port so `packages/core` never imports argon2.
 * The argon2id implementation lives in `apps/server`.
 */
export interface PasswordHasher {
  hash(plaintext: string): Promise<string>;

  /**
   * Verify a plaintext against a stored hash. Must not throw on a malformed
   * stored hash — return `false`, so a corrupt row cannot be distinguished from
   * a wrong password.
   */
  verify(storedHash: string, plaintext: string): Promise<boolean>;
}
