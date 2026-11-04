import type {
  NewSession,
  RevokeSessionInput,
  Session,
  SessionRepository,
  TouchSessionInput,
} from "@teacherly/core";
import { and, eq, gt, isNull } from "drizzle-orm";

import type { Database } from "../client";
import { sessions, type SessionRow } from "../schema";

function toSession(row: SessionRow): Session {
  return {
    id: row.id,
    teacherId: row.teacherId,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    lastUsedAt: row.lastUsedAt,
    revokedAt: row.revokedAt,
  };
}

export class DrizzleSessionRepository implements SessionRepository {
  constructor(private readonly db: Database) {}

  async create(input: NewSession): Promise<Session> {
    const rows = await this.db
      .insert(sessions)
      .values({
        teacherId: input.teacherId,
        tokenHash: input.tokenHash,
        createdAt: input.createdAt,
        expiresAt: input.expiresAt,
        lastUsedAt: input.createdAt,
      })
      .returning();
    const row = rows[0];
    if (row === undefined) throw new Error("Failed to create session row.");
    return toSession(row);
  }

  async findActiveByTokenHash(tokenHash: string, now: Date): Promise<Session | null> {
    const rows = await this.db
      .select()
      .from(sessions)
      .where(
        // The liveness filter is part of the query, not something the caller
        // is trusted to re-check after the fact.
        and(
          eq(sessions.tokenHash, tokenHash),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, now),
        ),
      )
      .limit(1);
    const row = rows[0];
    return row === undefined ? null : toSession(row);
  }

  async revoke(input: RevokeSessionInput): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: input.revokedAt })
      .where(
        // Scoped by teacher as well as by session id: workspace isolation is
        // applied here so no route handler has to remember it.
        and(
          eq(sessions.id, input.sessionId),
          eq(sessions.teacherId, input.teacherId),
          isNull(sessions.revokedAt),
        ),
      );
  }

  async touch(input: TouchSessionInput): Promise<void> {
    await this.db
      .update(sessions)
      .set({ lastUsedAt: input.at })
      .where(and(eq(sessions.id, input.sessionId), eq(sessions.teacherId, input.teacherId)));
  }
}
