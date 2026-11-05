import {
  normalizeEmail,
  type NewTeacher,
  type Teacher,
  type TeacherCredentials,
  type TeacherId,
  type TeacherRepository,
} from "@teacherly/core";
import { eq } from "drizzle-orm";

import type { Database } from "../client";
import { teachers, type TeacherRow } from "../schema";

function toTeacher(row: TeacherRow): Teacher {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    locale: row.locale,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleTeacherRepository implements TeacherRepository {
  constructor(private readonly db: Database) {}

  async findById(teacherId: TeacherId): Promise<Teacher | null> {
    const rows = await this.db.select().from(teachers).where(eq(teachers.id, teacherId)).limit(1);
    const row = rows[0];
    return row === undefined ? null : toTeacher(row);
  }

  async findCredentialsByEmail(email: string): Promise<TeacherCredentials | null> {
    // Normalization happens here so no call site can match the wrong way.
    const normalized = normalizeEmail(email);
    if (normalized.length === 0) return null;

    const rows = await this.db
      .select()
      .from(teachers)
      .where(eq(teachers.email, normalized))
      .limit(1);
    const row = rows[0];
    return row === undefined ? null : { teacher: toTeacher(row), passwordHash: row.passwordHash };
  }

  async create(input: NewTeacher): Promise<Teacher | null> {
    const rows = await this.db
      .insert(teachers)
      .values({
        email: normalizeEmail(input.email),
        passwordHash: input.passwordHash,
        displayName: input.displayName,
        locale: input.locale,
      })
      // Collapse the unique violation into "no row" so the domain service can
      // report it without a driver-specific error reaching the HTTP layer.
      .onConflictDoNothing({ target: teachers.email })
      .returning();
    const row = rows[0];
    return row === undefined ? null : toTeacher(row);
  }
}
