import type { TeacherId } from "@teacherly/core";
import { sql } from "drizzle-orm";
import { check, index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

/** Mirrors `Locale` in @teacherly/core. */
export const localeEnum = pgEnum("locale", ["en", "es"]);

export const teachers = pgTable(
  "teachers",
  {
    // `$type` rather than a cast in the row mapper: reading this column is the
    // moment a teacher id becomes a `TeacherId`, so the brand is declared at
    // the source and `toTeacher` needs no assertion at all.
    id: uuid("id").primaryKey().defaultRandom().$type<TeacherId>(),
    /** Stored already normalized (trimmed + lowercased) — see the check constraint. */
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    locale: localeEnum("locale").notNull().default("en"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Case-insensitive uniqueness is enforced by storing the normalized form and
    // then forbidding any other form, so this plain unique index is sufficient.
    uniqueIndex("teachers_email_key").on(table.email),
    check("teachers_email_normalized", sql`${table.email} = lower(${table.email})`),
    check("teachers_email_not_blank", sql`length(${table.email}) > 0`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "cascade" })
      .$type<TeacherId>(),
    /**
     * SHA-256 of the opaque token carried by the cookie. The token itself is
     * never persisted, so a database read does not yield live sessions.
     */
    tokenHash: text("token_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_key").on(table.tokenHash),
    index("sessions_teacher_id_idx").on(table.teacherId),
  ],
);

export type TeacherRow = typeof teachers.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
