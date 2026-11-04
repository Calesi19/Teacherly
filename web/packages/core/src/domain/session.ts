import type { TeacherId } from "./teacher";

export type SessionId = string;

/**
 * A server-side session. The cookie carries an opaque 256-bit token; only the
 * SHA-256 of that token is ever persisted, so reading this table does not yield
 * usable credentials.
 */
export interface Session {
  id: SessionId;
  teacherId: TeacherId;
  createdAt: Date;
  expiresAt: Date;
  lastUsedAt: Date;
  revokedAt: Date | null;
}

export interface NewSession {
  teacherId: TeacherId;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
}

/** Absolute session lifetime. There is no rolling refresh. */
export const SESSION_ABSOLUTE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export function computeSessionExpiry(issuedAt: Date): Date {
  return new Date(issuedAt.getTime() + SESSION_ABSOLUTE_TTL_MS);
}

export function isSessionActive(session: Session, now: Date): boolean {
  if (session.revokedAt !== null) return false;
  return session.expiresAt.getTime() > now.getTime();
}
