import { useState, useEffect, useCallback, useMemo } from "react";
import Database from "@tauri-apps/plugin-sql";
import type { SchedulePeriod } from "../types/schedule";
import type { AttendanceStatus, DayAttendanceStatus, StudentDayStatus } from "../types/attendance";

const DB_URL = "sqlite:teacherly.db";

interface RawAttendanceRow {
  id: number;
  schedule_period_id: number;
  student_id: number;
  status: AttendanceStatus;
  notes: string | null;
}

function deriveDayStatus(
  sortedPeriods: SchedulePeriod[],
  studentId: number,
  records: RawAttendanceRow[]
): { status: DayAttendanceStatus; periodStatuses: { periodId: number; periodName: string; status: "present" | "absent" }[] } {
  const periodStatuses = sortedPeriods.map((p) => {
    const rec = records.find((r) => r.student_id === studentId && r.schedule_period_id === p.id);
    const raw = rec?.status ?? "present";
    const status: "present" | "absent" = raw === "absent" ? "absent" : "present";
    return { periodId: p.id, periodName: p.name, status };
  });

  if (sortedPeriods.length === 0) return { status: "present", periodStatuses: [] };

  const studentRecords = records.filter((r) => r.student_id === studentId);
  const statuses = sortedPeriods.map((p) => {
    const rec = studentRecords.find((r) => r.schedule_period_id === p.id);
    return (rec?.status ?? "present") as AttendanceStatus;
  });

  if (statuses.every((s) => s === "absent")) return { status: "absent", periodStatuses };
  if (statuses.every((s) => s === "present")) return { status: "present", periodStatuses };
  if (statuses[0] === "late" && statuses.slice(1).every((s) => s === "present")) {
    return { status: "late", periodStatuses };
  }
  return { status: "partial", periodStatuses };
}

export function useAttendance(groupId: number, date: string) {
  const [periodsForDay, setPeriodsForDay] = useState<SchedulePeriod[]>([]);
  const [rawRecords, setRawRecords] = useState<RawAttendanceRow[]>([]);
  const [allStudents, setAllStudents] = useState<{ id: number; name: string }[]>([]);
  const [isCanceled, setIsCanceled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const db = await Database.load(DB_URL);
      const dayOfWeek = new Date(date + "T12:00:00").getDay();

      const periods = await db.select<SchedulePeriod[]>(
        "SELECT id, group_id, day_of_week, name, start_time, end_time, sort_order, created_at FROM schedule_periods WHERE group_id = ? AND day_of_week = ? AND is_deleted = 0 ORDER BY sort_order ASC, name ASC",
        [groupId, dayOfWeek]
      );
      setPeriodsForDay(periods);

      const students = await db.select<{ id: number; name: string }[]>(
        "SELECT id, name FROM students WHERE group_id = ? AND is_deleted = 0 ORDER BY name ASC",
        [groupId]
      );
      setAllStudents(students);

      if (periods.length > 0) {
        const periodIds = periods.map((p) => p.id);
        const placeholders = periodIds.map(() => "?").join(",");
        const records = await db.select<RawAttendanceRow[]>(
          `SELECT id, schedule_period_id, student_id, status, notes FROM attendance_records WHERE schedule_period_id IN (${placeholders}) AND date = ? AND is_deleted = 0`,
          [...periodIds, date]
        );
        setRawRecords(records);
      } else {
        setRawRecords([]);
      }

      const canceled = await db.select<{ id: number }[]>(
        "SELECT id FROM canceled_days WHERE group_id = ? AND date = ? AND is_deleted = 0",
        [groupId, date]
      );
      setIsCanceled(canceled.length > 0);

      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [groupId, date]);

  const dayStatuses = useMemo((): StudentDayStatus[] => {
    return allStudents.map((s) => {
      const { status, periodStatuses } = deriveDayStatus(periodsForDay, s.id, rawRecords);
      return { student_id: s.id, student_name: s.name, status, periodStatuses };
    });
  }, [allStudents, periodsForDay, rawRecords]);

  const upsert = useCallback(
    async (
      db: Awaited<ReturnType<typeof Database.load>>,
      studentId: number,
      periodId: number,
      status: AttendanceStatus,
      notes: string | null = null
    ) => {
      await db.execute(
        `INSERT INTO attendance_records (schedule_period_id, student_id, date, status, notes)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(schedule_period_id, student_id, date)
         DO UPDATE SET status = excluded.status, notes = excluded.notes`,
        [periodId, studentId, date, status, notes]
      );
    },
    [date]
  );

  const markPresent = useCallback(
    async (studentId: number) => {
      const db = await Database.load(DB_URL);
      await Promise.all(periodsForDay.map((p) => upsert(db, studentId, p.id, "present")));
      await fetchData(true);
    },
    [periodsForDay, upsert, fetchData]
  );

  const markAbsent = useCallback(
    async (studentId: number) => {
      const db = await Database.load(DB_URL);
      await Promise.all(periodsForDay.map((p) => upsert(db, studentId, p.id, "absent")));
      await fetchData(true);
    },
    [periodsForDay, upsert, fetchData]
  );

  const markLate = useCallback(
    async (studentId: number) => {
      const db = await Database.load(DB_URL);
      await Promise.all(
        periodsForDay.map((p, idx) => upsert(db, studentId, p.id, idx === 0 ? "late" : "present"))
      );
      await fetchData(true);
    },
    [periodsForDay, upsert, fetchData]
  );

  const markPartial = useCallback(
    async (studentId: number, periodStatuses: { periodId: number; status: "present" | "absent" }[], note?: string) => {
      const db = await Database.load(DB_URL);
      await Promise.all(
        periodStatuses.map(({ periodId, status }) => upsert(db, studentId, periodId, status))
      );
      if (note?.trim()) {
        await db.execute(
          "INSERT INTO student_notes (student_id, content, tags) VALUES (?, ?, ?)",
          [studentId, note.trim(), "attendance"]
        );
      }
      await fetchData(true);
    },
    [upsert, fetchData]
  );

  const markDayStatusBulk = useCallback(
    async (studentIds: number[], status: "present" | "absent" | "late") => {
      const db = await Database.load(DB_URL);
      await Promise.all(
        studentIds.flatMap((sid) =>
          periodsForDay.map((p, idx) => {
            const s: AttendanceStatus =
              status === "late" ? (idx === 0 ? "late" : "present") : status;
            return upsert(db, sid, p.id, s);
          })
        )
      );
      await fetchData(true);
    },
    [periodsForDay, upsert, fetchData]
  );

  const cancelDay = useCallback(
    async (reason?: string) => {
      const db = await Database.load(DB_URL);
      await db.execute(
        `INSERT INTO canceled_days (group_id, date, reason)
         VALUES (?, ?, ?)
         ON CONFLICT(group_id, date) DO UPDATE SET is_deleted = 0, reason = excluded.reason`,
        [groupId, date, reason ?? null]
      );
      await fetchData(true);
    },
    [groupId, date, fetchData]
  );

  const uncancelDay = useCallback(
    async () => {
      const db = await Database.load(DB_URL);
      await db.execute(
        "UPDATE canceled_days SET is_deleted = 1 WHERE group_id = ? AND date = ? AND is_deleted = 0",
        [groupId, date]
      );
      await fetchData(true);
    },
    [groupId, date, fetchData]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    periodsForDay,
    allStudents,
    dayStatuses,
    isCanceled,
    loading,
    error,
    markPresent,
    markAbsent,
    markLate,
    markPartial,
    markDayStatusBulk,
    cancelDay,
    uncancelDay,
  };
}
