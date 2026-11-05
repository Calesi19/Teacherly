import type { NewSession, Session, SessionId } from "../domain/session";
import type { TeacherId } from "../domain/teacher";

export interface RevokeSessionInput {
  sessionId: SessionId;
  teacherId: TeacherId;
  revokedAt: Date;
}

export interface TouchSessionInput {
  sessionId: SessionId;
  teacherId: TeacherId;
  at: Date;
}

export interface SessionRepository {
  create(input: NewSession): Promise<Session>;

  /**
   * Resolve a session from the SHA-256 of a cookie token. The implementation
   * must apply the "not revoked and not expired" filter itself — an expired row
   * must never be returned for the caller to check.
   */
  findActiveByTokenHash(tokenHash: string, now: Date): Promise<Session | null>;

  /**
   * Revoke one session. Scoped by `teacherId` as well as `sessionId`: the
   * `WHERE` clause lives here, not at the call site.
   */
  revoke(input: RevokeSessionInput): Promise<void>;

  /** Record last use. Does not extend `expiresAt` — there is no rolling refresh. */
  touch(input: TouchSessionInput): Promise<void>;
}
