import { useState, useEffect, useCallback, useMemo } from "react";
import Database from "@tauri-apps/plugin-sql";
import type { AttendanceStatus, DayAttendanceStatus } from "../types/attendance";

const DB_URL = "sqlite:tizara.db";

interface RawRecord {
  date: string;
  period_name: string;
  status: AttendanceStatus;
  notes: string | null;
  sort_order: number;
  start_time: string;
}

export interface StudentAttendanceDay {
  date: string;
  dayStatus: DayAttendanceStatus;
  records: { period_name: string; status: AttendanceStatus; notes: string | null }[];
}

export interface StudentAttendanceSummary {
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  partial: number;
}

function deriveDayStatus(records: RawRecord[]): { status: DayAttendanceStatus } {
  if (records.length === 0) return { status: "present" };

  const sorted = [...records].sort(
    (a, b) => a.sort_order - b.sort_order || a.start_time.localeCompare(b.start_time)
  );
  const statuses = sorted.map((r) => r.status);

  if (statuses.every((s) => s === "absent")) return { status: "absent" };
  if (statuses.every((s) => s === "present")) return { status: "present" };
  if (statuses[0] === "late" && statuses.slice(1).every((s) => s === "present")) {
    return { status: "late" };
  }
  return { status: "partial" };
}

export function useStudentAttendance(studentId: number) {
  const [rawRecords, setRawRecords] = useState<RawRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const db = await Database.load(DB_URL);
      const rows = await db.select<RawRecord[]>(
        `SELECT ar.date, sp.name as period_name, ar.status, ar.notes, sp.sort_order, sp.start_time
         FROM attendance_records ar
         JOIN schedule_periods sp ON sp.id = ar.schedule_period_id
         WHERE ar.student_id = ? AND ar.is_deleted = 0
         ORDER BY ar.date DESC, sp.sort_order ASC, sp.start_time ASC`,
        [studentId]
      );
      setRawRecords(rows);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const days = useMemo((): StudentAttendanceDay[] => {
    const grouped = new Map<string, RawRecord[]>();
    for (const r of rawRecords) {
      if (!grouped.has(r.date)) grouped.set(r.date, []);
      grouped.get(r.date)!.push(r);
    }
    return Array.from(grouped.entries()).map(([date, recs]) => {
      const { status } = deriveDayStatus(recs);
      return {
        date,
        dayStatus: status,
        records: recs.map((r) => ({ period_name: r.period_name, status: r.status, notes: r.notes })),
      };
    });
  }, [rawRecords]);

  const summary = useMemo(
    (): StudentAttendanceSummary => ({
      totalDays: days.length,
      present: days.filter((d) => d.dayStatus === "present").length,
      absent: days.filter((d) => d.dayStatus === "absent").length,
      late: days.filter((d) => d.dayStatus === "late").length,
      partial: days.filter((d) => d.dayStatus === "partial").length,
    }),
    [days]
  );

  return { days, summary, loading, error };
}
