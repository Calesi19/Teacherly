import { useState, useEffect, useCallback } from "react";
import Database from "@tauri-apps/plugin-sql";

const DB_URL = "sqlite:teacherly.db";

export interface DashboardStudentRow {
  id: number;
  name: string;
  gender: string | null;
  birthdate: string | null;
  has_special_education: number;
  allergies: string | null;
  conditions: string | null;
}

export interface AttendanceSummaryRow {
  student_id: number;
  student_name: string;
  days_absent: number;
  days_recorded: number;
}

export interface UngradedRow {
  assignment_id: number;
  title: string;
  assigned_date: string;
  student_id: number;
  student_name: string;
}

export interface DashboardData {
  students: DashboardStudentRow[];
  attendance: AttendanceSummaryRow[];
  ungradedItems: UngradedRow[];
  periodCount: number;
  loading: boolean;
  error: string | null;
}

export function useDashboardData(groupId: number | null): DashboardData {
  const [students, setStudents] = useState<DashboardStudentRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSummaryRow[]>([]);
  const [ungradedItems, setUngradedItems] = useState<UngradedRow[]>([]);
  const [periodCount, setPeriodCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (groupId == null) {
      setStudents([]);
      setAttendance([]);
      setUngradedItems([]);
      setPeriodCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const db = await Database.load(DB_URL);

      const [studentRows, attendanceRows, ungradedRows, periodRows] = await Promise.all([
        db.select<DashboardStudentRow[]>(
          `SELECT st.id, st.name, st.gender, st.birthdate,
                  COALESCE(ss.has_special_education, 0) AS has_special_education,
                  ss.allergies, ss.conditions
           FROM students st
           LEFT JOIN student_services ss ON ss.student_id = st.id AND ss.is_deleted = 0
           WHERE st.group_id = ? AND st.is_deleted = 0
           ORDER BY st.name ASC`,
          [groupId]
        ),
        db.select<AttendanceSummaryRow[]>(
          `SELECT st.id AS student_id, st.name AS student_name,
                  COUNT(DISTINCT CASE WHEN ar.status = 'absent' THEN ar.date END) AS days_absent,
                  COUNT(DISTINCT ar.date) AS days_recorded
           FROM students st
           LEFT JOIN attendance_records ar
             ON ar.student_id = st.id AND ar.is_deleted = 0
           WHERE st.group_id = ? AND st.is_deleted = 0
           GROUP BY st.id, st.name`,
          [groupId]
        ),
        db.select<UngradedRow[]>(
          `SELECT a.id AS assignment_id, a.title, a.assigned_date,
                  st.id AS student_id, st.name AS student_name
           FROM assignments a
           JOIN students st ON st.group_id = a.group_id AND st.is_deleted = 0
           LEFT JOIN assignment_scores s
             ON s.assignment_id = a.id AND s.student_id = st.id AND s.is_deleted = 0
           WHERE a.group_id = ? AND a.is_deleted = 0
             AND julianday('now') - julianday(a.assigned_date) > 7
             AND s.score IS NULL
             AND COALESCE(s.exempt, 0) = 0
           ORDER BY a.assigned_date ASC`,
          [groupId]
        ),
        db.select<{ count: number }[]>(
          `SELECT COUNT(*) AS count FROM schedule_periods WHERE group_id = ? AND is_deleted = 0`,
          [groupId]
        ),
      ]);

      setStudents(studentRows);
      setAttendance(attendanceRows);
      setUngradedItems(ungradedRows);
      setPeriodCount(periodRows[0]?.count ?? 0);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { students, attendance, ungradedItems, periodCount, loading, error };
}
