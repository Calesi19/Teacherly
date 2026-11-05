import { DEFAULT_GRADING_SCALE, type TeacherId } from "@teacherly/core";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  unique,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

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

/* ===========================================================================
 * Teacher-owned data: classes, students, assessments, grades.
 *
 * Two conventions run through all four tables, and both are load-bearing.
 *
 * 1. EVERY TABLE CARRIES `teacher_id`, EVEN WHEN IT IS DERIVABLE.
 *
 *    A student's teacher is reachable through its class, and a grade's through
 *    either side. Storing it anyway is what lets `packages/db` scope a read with
 *    `WHERE teacher_id = $1` on the table it is already selecting from, with no
 *    join and no subquery — so the scoping clause is impossible to omit by
 *    accident and impossible to get wrong by joining the wrong way.
 *
 *    The usual objection to denormalising a tenant key is that the copy can
 *    drift from the truth. Here it cannot: each child table's foreign key is
 *    *composite*, pointing at `(id, teacher_id)` on its parent. A student row
 *    whose `teacher_id` disagrees with its class's `teacher_id` does not violate
 *    a convention, it violates a foreign key, and Postgres refuses to write it.
 *    `grades` goes further and points at both `(assessment_id, teacher_id)` and
 *    `(student_id, teacher_id)`, so a grade cannot staple one teacher's
 *    assessment to another teacher's student even in principle.
 *
 *    That is the property the desktop app's 82 hand-scoped queries were trying
 *    to maintain in application code, one `WHERE group_id = ?` at a time.
 *
 * 2. SOFT DELETE, per the repository's standing rule (see CLAUDE.md): no row is
 *    ever removed, `is_deleted` is set and every SELECT filters it out. Rendered
 *    as `boolean` rather than the desktop app's SQLite `INTEGER`, which is the
 *    same two states in the type Postgres has for them.
 *
 *    `grades` is the deliberate exception and the reason is in
 *    `GradeRepository.clear`: for a grade, "no row" is already a meaningful
 *    state that the formula treats differently from a zero, and a soft-deleted
 *    grade would be a second kind of row-that-does-not-count sitting next to it.
 * ======================================================================== */

/**
 * The grading cutoffs are four columns, not a JSON column.
 *
 * Both satisfy "readable without a join" and both default cleanly, so the
 * decision came down to what the database can be made to guarantee:
 *
 *   - Columns take CHECK constraints. `scale_a > scale_b > scale_c > scale_d`,
 *     `scale_d > 0`, `scale_a <= 100` are three lines of DDL, and they make
 *     "bands ordered, non-overlapping, covering 0–100" an invariant of the
 *     table rather than a promise `createGradingScale` keeps. A JSON column can
 *     only be constrained with an expression over `->>` casts, or a trigger.
 *   - Columns have a type. `numeric(5, 2)` is exactly the precision the grading
 *     module's exact arithmetic accepts; a JSON number is whatever was written,
 *     including `"ninety"`, and Drizzle would hand it over as `unknown`.
 *   - The arity is fixed by the product decision. A–F is five bands and four
 *     cutoffs, decided, not configurable. JSON earns its keep when the shape is
 *     open-ended, and this one is not.
 *
 * The cost is four columns per class instead of one, and a migration if a sixth
 * band is ever wanted. That is the right trade for a number that decides what
 * goes home to a parent.
 */
export const classes = pgTable(
  "classes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "cascade" })
      .$type<TeacherId>(),
    name: text("name").notNull(),
    /** The desktop app's `assignments.period_name`, moved here and renamed. */
    courseName: text("course_name").notNull(),

    scaleA: numeric("scale_a", { precision: 5, scale: 2, mode: "number" })
      .notNull()
      .default(DEFAULT_GRADING_SCALE.a),
    scaleB: numeric("scale_b", { precision: 5, scale: 2, mode: "number" })
      .notNull()
      .default(DEFAULT_GRADING_SCALE.b),
    scaleC: numeric("scale_c", { precision: 5, scale: 2, mode: "number" })
      .notNull()
      .default(DEFAULT_GRADING_SCALE.c),
    scaleD: numeric("scale_d", { precision: 5, scale: 2, mode: "number" })
      .notNull()
      .default(DEFAULT_GRADING_SCALE.d),

    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // The target of every child table's composite foreign key. `id` is already
    // unique on its own; this pair is what lets a child declare "my class, and
    // my class's teacher, are the same row".
    //
    // A `unique(...)` CONSTRAINT rather than a `uniqueIndex(...)`, and the
    // difference is load-bearing in the generated DDL: Postgres will not accept
    // a composite foreign key unless a unique constraint or index on the
    // referenced columns already exists, and drizzle-kit emits every
    // `CREATE UNIQUE INDEX` *after* the `ALTER TABLE ... ADD FOREIGN KEY`
    // block. As an index this migration failed on an empty database with
    // 42830, "there is no unique constraint matching given keys". A constraint
    // is emitted inline in `CREATE TABLE`, so it exists before any FK is added.
    //
    // It is also the more honest declaration: this pair is an invariant the
    // child tables depend on, not an access path someone added for speed.
    unique("classes_id_teacher_id_key").on(table.id, table.teacherId),
    index("classes_teacher_id_idx").on(table.teacherId),
    check("classes_name_not_blank", sql`length(btrim(${table.name})) > 0`),
    check("classes_course_name_not_blank", sql`length(btrim(${table.courseName})) > 0`),
    // The scale invariants, in the one place no code path can bypass. These are
    // the same rules `createGradingScale` enforces; having both is the point —
    // the application gives a teacher a useful 400, the database guarantees the
    // table cannot hold a broken scale however the write arrived.
    check(
      "classes_scale_descending",
      sql`${table.scaleA} > ${table.scaleB} AND ${table.scaleB} > ${table.scaleC} AND ${table.scaleC} > ${table.scaleD}`,
    ),
    check(
      "classes_scale_in_range",
      sql`${table.scaleA} <= 100 AND ${table.scaleD} > 0`,
    ),
  ],
);

export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teacherId: uuid("teacher_id").notNull().$type<TeacherId>(),
    classId: uuid("class_id").notNull(),
    name: text("name").notNull(),
    /** The school's own identifier, when the teacher keeps one. */
    studentNumber: text("student_number"),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // The composite FK, rather than `class_id -> classes.id` plus a separate
    // `teacher_id -> teachers.id`. Those two would each hold while still
    // allowing a student in teacher A's class labelled as teacher B's.
    foreignKey({
      name: "students_class_fk",
      columns: [table.classId, table.teacherId],
      foreignColumns: [classes.id, classes.teacherId],
    }).onDelete("cascade"),
    // A constraint, not an index — see the note on `classes_id_teacher_id_key`.
    unique("students_id_teacher_id_key").on(table.id, table.teacherId),
    index("students_class_id_idx").on(table.classId),
    index("students_teacher_id_idx").on(table.teacherId),
    check("students_name_not_blank", sql`length(btrim(${table.name})) > 0`),
  ],
);

export const assessments = pgTable(
  "assessments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teacherId: uuid("teacher_id").notNull().$type<TeacherId>(),
    classId: uuid("class_id").notNull(),
    name: text("name").notNull(),
    /**
     * `numeric(10, 2)`, matching `grades.score`. Not `real`: the desktop app's
     * `REAL` columns mean a 33.33-point assessment is stored as something near
     * 33.33, and the grading module's exact arithmetic would have nothing exact
     * to work from.
     */
    maxScore: numeric("max_score", { precision: 10, scale: 2, mode: "number" }).notNull(),
    /**
     * A calendar date, not a timestamp. An assessment happens on a school day;
     * storing an instant would put the same assessment on two different days
     * either side of midnight in two different time zones.
     */
    assignedOn: date("assigned_on").notNull(),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "assessments_class_fk",
      columns: [table.classId, table.teacherId],
      foreignColumns: [classes.id, classes.teacherId],
    }).onDelete("cascade"),
    // A constraint, not an index — see the note on `classes_id_teacher_id_key`.
    unique("assessments_id_teacher_id_key").on(table.id, table.teacherId),
    index("assessments_class_id_idx").on(table.classId),
    index("assessments_teacher_id_idx").on(table.teacherId),
    check("assessments_name_not_blank", sql`length(btrim(${table.name})) > 0`),
    // Zero would be an assessment that contributes nothing to any denominator
    // while still looking like a graded item — a divide-by-zero waiting for a
    // caller that forgot to check. Refused at the table.
    check("assessments_max_score_positive", sql`${table.maxScore} > 0`),
  ],
);

/**
 * One row per (assessment, student) — and only where a grade has been recorded.
 *
 * THE MISSING ROW IS A STATE, not an absence. The composite primary key is what
 * makes it one: there is exactly one row per pair or there is none, so "no row"
 * is unambiguous and means *ungraded*. A zero is a row with `score = 0`, which
 * counts for nothing and still puts the assessment's `max_score` in the
 * denominator. The two are different grades and the schema cannot blur them:
 *
 *   - no row       -> not marked. Out of the numerator and the denominator.
 *   - score = 0    -> marked, earned nothing. In both.
 *   - score = NULL -> a row recording `late` or `exempt` before marking. Out of
 *                     both, like no row, but able to carry those flags.
 *   - exempt       -> excused. Out of both, whatever `score` says.
 *
 * There is no `DEFAULT 0` on `score` and no `NOT NULL`, which is the schema
 * refusing to let a `COALESCE(score, 0)` anywhere upstream turn an unmarked
 * assessment into a zero.
 */
export const grades = pgTable(
  "grades",
  {
    teacherId: uuid("teacher_id").notNull().$type<TeacherId>(),
    assessmentId: uuid("assessment_id").notNull(),
    studentId: uuid("student_id").notNull(),
    /** `null` is "no score recorded yet". Never a stand-in for zero. */
    score: numeric("score", { precision: 10, scale: 2, mode: "number" }),
    /** Excused. Leaves the numerator *and* the denominator entirely. */
    exempt: boolean("exempt").notNull().default(false),
    /** Recorded and reported. Never scored — the user's decision, point 4. */
    late: boolean("late").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // One grade per pair, as the key rather than as a unique index, so "no row"
    // is the only other possibility.
    primaryKey({ name: "grades_pkey", columns: [table.assessmentId, table.studentId] }),
    // Both sides scoped to the same teacher. Neither FK alone would stop a
    // grade joining teacher A's assessment to teacher B's student; together
    // they make it unrepresentable, because `teacher_id` is one column and has
    // to satisfy both.
    foreignKey({
      name: "grades_assessment_fk",
      columns: [table.assessmentId, table.teacherId],
      foreignColumns: [assessments.id, assessments.teacherId],
    }).onDelete("cascade"),
    foreignKey({
      name: "grades_student_fk",
      columns: [table.studentId, table.teacherId],
      foreignColumns: [students.id, students.teacherId],
    }).onDelete("cascade"),
    index("grades_teacher_id_idx").on(table.teacherId),
    index("grades_student_id_idx").on(table.studentId),
    check("grades_score_non_negative", sql`${table.score} IS NULL OR ${table.score} >= 0`),
  ],
);

export type TeacherRow = typeof teachers.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type ClassRow = typeof classes.$inferSelect;
export type StudentRow = typeof students.$inferSelect;
export type AssessmentRow = typeof assessments.$inferSelect;
export type GradeRow = typeof grades.$inferSelect;
