import Database from "@tauri-apps/plugin-sql";
import type { Student } from "../types/student";
import type { Contact } from "../types/contact";
import type { Address } from "../types/address";
import type { StudentServices } from "../types/studentServices";
import type { StudentAccommodations } from "../types/studentAccommodations";
import type { StudentObservations } from "../types/studentObservations";
import type { Note } from "../types/note";

const DB_URL = "sqlite:teacherly.db";

export interface AttendanceRecordRow {
  date: string;
  periodName: string;
  status: "present" | "absent" | "late" | "early_pickup";
  notes: string | null;
}

export interface StudentGradeRow {
  assignmentTitle: string;
  periodName: string;
  maxScore: number;
  score: number | null;
}

export async function fetchStudentProfile(studentId: number): Promise<Student | null> {
  const db = await Database.load(DB_URL);
  const rows = await db.select<Student[]>(
    `SELECT id, group_id, name, gender, birthdate, student_number,
            enrollment_date, enrollment_end_date, created_at
     FROM students WHERE id = ? AND is_deleted = 0`,
    [studentId]
  );
  return rows[0] ?? null;
}

export async function fetchStudentContacts(studentId: number): Promise<Contact[]> {
  const db = await Database.load(DB_URL);
  return db.select<Contact[]>(
    `SELECT id, student_id, name, relationship, phone, email,
            is_emergency_contact, is_primary_guardian, created_at
     FROM contacts WHERE student_id = ? AND is_deleted = 0 ORDER BY name ASC`,
    [studentId]
  );
}

export async function fetchStudentAddresses(studentId: number): Promise<Address[]> {
  const db = await Database.load(DB_URL);
  return db.select<Address[]>(
    `SELECT id, student_id, label, street, city, state, zip_code, country,
            is_student_home, created_at
     FROM student_addresses WHERE student_id = ? AND is_deleted = 0`,
    [studentId]
  );
}

export async function fetchStudentServices(studentId: number): Promise<StudentServices | null> {
  const db = await Database.load(DB_URL);
  const rows = await db.select<StudentServices[]>(
    `SELECT id, student_id, has_special_education, therapy_speech, therapy_occupational,
            therapy_psychological, therapy_physical, therapy_educational,
            medical_plan, has_treatment, allergies, conditions
     FROM student_services WHERE student_id = ? AND is_deleted = 0`,
    [studentId]
  );
  return rows[0] ?? null;
}

export async function fetchStudentAccommodations(studentId: number): Promise<StudentAccommodations | null> {
  const db = await Database.load(DB_URL);
  const rows = await db.select<StudentAccommodations[]>(
    `SELECT id, student_id, desk_placement, extended_time, shorter_assignments,
            use_abacus, simple_instructions, visual_examples
     FROM student_accommodations WHERE student_id = ? AND is_deleted = 0`,
    [studentId]
  );
  return rows[0] ?? null;
}

export async function fetchStudentObservations(studentId: number): Promise<StudentObservations | null> {
  const db = await Database.load(DB_URL);
  const rows = await db.select<StudentObservations[]>(
    `SELECT * FROM student_observations WHERE student_id = ? AND is_deleted = 0`,
    [studentId]
  );
  return rows[0] ?? null;
}

export async function fetchStudentNotes(studentId: number, tagFilter?: string): Promise<Note[]> {
  const db = await Database.load(DB_URL);
  let sql = `SELECT id, student_id, content, tags, created_at
             FROM student_notes WHERE student_id = ? AND is_deleted = 0`;
  const params: unknown[] = [studentId];
  if (tagFilter) {
    sql += " AND (',' || tags || ',') LIKE ?";
    params.push(`%,${tagFilter},%`);
  }
  sql += " ORDER BY created_at ASC";
  return db.select<Note[]>(sql, params);
}

export async function fetchStudentAttendanceRecords(
  studentId: number,
  dateFrom?: string,
  dateTo?: string
): Promise<AttendanceRecordRow[]> {
  const db = await Database.load(DB_URL);
  let sql = `
    SELECT ar.date, sp.name AS period_name, ar.status, ar.notes
    FROM attendance_records ar
    JOIN schedule_periods sp ON sp.id = ar.schedule_period_id
    WHERE ar.student_id = ? AND ar.is_deleted = 0 AND sp.is_deleted = 0
  `;
  const params: unknown[] = [studentId];
  if (dateFrom) { sql += " AND ar.date >= ?"; params.push(dateFrom); }
  if (dateTo) { sql += " AND ar.date <= ?"; params.push(dateTo); }
  sql += " ORDER BY ar.date DESC, sp.sort_order ASC, sp.start_time ASC";

  interface RawRow {
    date: string;
    period_name: string;
    status: "present" | "absent" | "late" | "early_pickup";
    notes: string | null;
  }
  const rows = await db.select<RawRow[]>(sql, params);
  return rows.map((r) => ({
    date: r.date,
    periodName: r.period_name,
    status: r.status,
    notes: r.notes,
  }));
}

export async function fetchStudentGrades(
  studentId: number,
  periodFilter?: string
): Promise<StudentGradeRow[]> {
  const db = await Database.load(DB_URL);
  let sql = `
    SELECT a.title AS assignment_title, a.period_name, a.max_score, s.score
    FROM assignment_scores s
    JOIN assignments a ON a.id = s.assignment_id
    WHERE s.student_id = ? AND s.is_deleted = 0 AND a.is_deleted = 0
  `;
  const params: unknown[] = [studentId];
  if (periodFilter) { sql += " AND a.period_name = ?"; params.push(periodFilter); }
  sql += " ORDER BY a.period_name ASC, a.created_at ASC";

  interface RawRow {
    assignment_title: string;
    period_name: string;
    max_score: number;
    score: number | null;
  }
  const rows = await db.select<RawRow[]>(sql, params);
  return rows.map((r) => ({
    assignmentTitle: r.assignment_title,
    periodName: r.period_name,
    maxScore: r.max_score,
    score: r.score,
  }));
}

export interface StudentCourseSummary {
  periodName: string;
  totalScore: number | null;
  totalMax: number;
  gradedCount: number;
  totalCount: number;
}

export async function fetchStudentCourseSummary(studentId: number): Promise<StudentCourseSummary[]> {
  const db = await Database.load(DB_URL);
  interface RawRow {
    period_name: string;
    total_score: number | null;
    total_max: number;
    graded_count: number;
    total_count: number;
  }
  const rows = await db.select<RawRow[]>(`
    SELECT a.period_name,
           SUM(s.score) AS total_score,
           SUM(CASE WHEN s.score IS NOT NULL THEN a.max_score ELSE 0 END) AS total_max,
           COUNT(s.score) AS graded_count,
           COUNT(a.id) AS total_count
    FROM assignment_scores s
    JOIN assignments a ON a.id = s.assignment_id
    WHERE s.student_id = ? AND s.is_deleted = 0 AND a.is_deleted = 0
    GROUP BY a.period_name
    ORDER BY a.period_name ASC
  `, [studentId]);
  return rows.map((r) => ({
    periodName: r.period_name,
    totalScore: r.total_score,
    totalMax: r.total_max,
    gradedCount: r.graded_count,
    totalCount: r.total_count,
  }));
}

export async function fetchStudentDistinctPeriods(studentId: number): Promise<string[]> {
  const db = await Database.load(DB_URL);
  const rows = await db.select<{ period_name: string }[]>(
    `SELECT DISTINCT a.period_name
     FROM assignment_scores s
     JOIN assignments a ON a.id = s.assignment_id
     WHERE s.student_id = ? AND s.is_deleted = 0 AND a.is_deleted = 0
     ORDER BY a.period_name ASC`,
    [studentId]
  );
  return rows.map((r) => r.period_name);
}
