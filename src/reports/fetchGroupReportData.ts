import Database from "@tauri-apps/plugin-sql";
import type { Student } from "../types/student";

const DB_URL = "sqlite:teacherly.db";

export interface AttendanceSummaryRow {
  studentId: number;
  studentName: string;
  present: number;
  absent: number;
  late: number;
  partial: number;
  total: number;
}

export interface AssignmentScoreRow {
  studentId: number;
  studentName: string;
  score: number | null;
}

export interface AssignmentReportData {
  assignmentId: number;
  title: string;
  periodName: string;
  maxScore: number;
  scores: AssignmentScoreRow[];
  average: number | null;
}

export async function fetchStudentsForReport(groupId: number): Promise<Student[]> {
  const db = await Database.load(DB_URL);
  return db.select<Student[]>(
    `SELECT id, group_id, name, gender, birthdate, student_number,
            enrollment_date, enrollment_end_date, created_at
     FROM students WHERE group_id = ? AND is_deleted = 0 ORDER BY name ASC`,
    [groupId]
  );
}

export async function fetchAttendanceSummary(
  groupId: number,
  dateFrom?: string,
  dateTo?: string
): Promise<AttendanceSummaryRow[]> {
  const db = await Database.load(DB_URL);

  const students = await db.select<{ id: number; name: string }[]>(
    "SELECT id, name FROM students WHERE group_id = ? AND is_deleted = 0 ORDER BY name ASC",
    [groupId]
  );

  const canceledRows = await db.select<{ date: string }[]>(
    "SELECT date FROM canceled_days WHERE group_id = ? AND is_deleted = 0",
    [groupId]
  );
  const canceledDates = new Set(canceledRows.map((r) => r.date));

  let sql = `
    SELECT ar.student_id, ar.date, ar.status, sp.sort_order, sp.start_time
    FROM attendance_records ar
    JOIN schedule_periods sp ON sp.id = ar.schedule_period_id
    WHERE sp.group_id = ? AND ar.is_deleted = 0
  `;
  const params: unknown[] = [groupId];
  if (dateFrom) { sql += " AND ar.date >= ?"; params.push(dateFrom); }
  if (dateTo) { sql += " AND ar.date <= ?"; params.push(dateTo); }
  sql += " ORDER BY ar.student_id, ar.date, sp.sort_order, sp.start_time";

  interface RawRow {
    student_id: number;
    date: string;
    status: string;
    sort_order: number;
    start_time: string;
  }
  const rows = await db.select<RawRow[]>(sql, params);

  const studentDays = new Map<number, Map<string, RawRow[]>>();
  for (const r of rows) {
    if (canceledDates.has(r.date)) continue;
    if (!studentDays.has(r.student_id)) studentDays.set(r.student_id, new Map());
    const dMap = studentDays.get(r.student_id)!;
    if (!dMap.has(r.date)) dMap.set(r.date, []);
    dMap.get(r.date)!.push(r);
  }

  return students.map((st) => {
    const dMap = studentDays.get(st.id) ?? new Map();
    let present = 0, absent = 0, late = 0, partial = 0;

    for (const dayRecs of dMap.values()) {
      const sorted = [...dayRecs].sort(
        (a, b) => a.sort_order - b.sort_order || a.start_time.localeCompare(b.start_time)
      );
      const statuses = sorted.map((r) => r.status);

      if (statuses.every((s) => s === "absent")) absent++;
      else if (statuses.every((s) => s === "present")) present++;
      else if (statuses[0] === "late" && statuses.slice(1).every((s) => s === "present")) late++;
      else partial++;
    }

    return {
      studentId: st.id,
      studentName: st.name,
      present,
      absent,
      late,
      partial,
      total: present + absent + late + partial,
    };
  });
}

export async function fetchGradeSummary(
  groupId: number,
  periodFilter?: string
): Promise<AssignmentReportData[]> {
  const db = await Database.load(DB_URL);

  let sql = `SELECT id, title, period_name, max_score FROM assignments WHERE group_id = ? AND is_deleted = 0`;
  const params: unknown[] = [groupId];
  if (periodFilter) { sql += " AND period_name = ?"; params.push(periodFilter); }
  sql += " ORDER BY created_at ASC";

  interface AssignRow { id: number; title: string; period_name: string; max_score: number; }
  const assignments = await db.select<AssignRow[]>(sql, params);
  if (assignments.length === 0) return [];

  interface ScoreRow { student_id: number; student_name: string; score: number | null; }

  const results: AssignmentReportData[] = [];
  for (const a of assignments) {
    const scores = await db.select<ScoreRow[]>(
      `SELECT st.id as student_id, st.name as student_name, s2.score
       FROM students st
       LEFT JOIN assignment_scores s2
         ON s2.student_id = st.id AND s2.assignment_id = ? AND s2.is_deleted = 0
       WHERE st.group_id = ? AND st.is_deleted = 0
       ORDER BY st.name ASC`,
      [a.id, groupId]
    );

    const graded = scores.filter((s) => s.score !== null);
    const average =
      graded.length > 0
        ? graded.reduce((acc, s) => acc + s.score!, 0) / graded.length
        : null;

    results.push({
      assignmentId: a.id,
      title: a.title,
      periodName: a.period_name,
      maxScore: a.max_score,
      scores: scores.map((s) => ({
        studentId: s.student_id,
        studentName: s.student_name,
        score: s.score,
      })),
      average,
    });
  }

  return results;
}

export async function fetchDistinctPeriods(groupId: number): Promise<string[]> {
  const db = await Database.load(DB_URL);
  const rows = await db.select<{ period_name: string }[]>(
    "SELECT DISTINCT period_name FROM assignments WHERE group_id = ? AND is_deleted = 0 ORDER BY period_name ASC",
    [groupId]
  );
  return rows.map((r) => r.period_name);
}
