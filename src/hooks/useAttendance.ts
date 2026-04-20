import { useState, useEffect, useCallback, useMemo } from "react";
import Database from "@tauri-apps/plugin-sql";
import type { SchedulePeriod } from "../types/schedule";
import type { AttendanceStatus, StudentAttendanceRow } from "../types/attendance";

const DB_URL = "sqlite:tizara.db";

interface RawAttendanceRow {
  id: number;
  schedule_period_id: number;
  student_id: number;
  status: AttendanceStatus;
}

export function useAttendance(classroomId: number, date: string) {
  const [periodsForDay, setPeriodsForDay] = useState<SchedulePeriod[]>([]);
  const [rawRecords, setRawRecords] = useState<RawAttendanceRow[]>([]);
  const [allStudents, setAllStudents] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const db = await Database.load(DB_URL);

      const dayOfWeek = new Date(date + "T12:00:00").getDay();

      const periods = await db.select<SchedulePeriod[]>(
        "SELECT id, classroom_id, day_of_week, name, start_time, end_time, sort_order, created_at FROM schedule_periods WHERE classroom_id = ? AND day_of_week = ? ORDER BY sort_order ASC, start_time ASC",
        [classroomId, dayOfWeek]
      );
      setPeriodsForDay(periods);

      const students = await db.select<{ id: number; name: string }[]>(
        "SELECT id, name FROM students WHERE classroom_id = ? ORDER BY name ASC",
        [classroomId]
      );
      setAllStudents(students);

      if (periods.length > 0) {
        const periodIds = periods.map((p) => p.id);
        const placeholders = periodIds.map(() => "?").join(",");
        const records = await db.select<RawAttendanceRow[]>(
          `SELECT id, schedule_period_id, student_id, status FROM attendance_records WHERE schedule_period_id IN (${placeholders}) AND date = ?`,
          [...periodIds, date]
        );
        setRawRecords(records);
      } else {
        setRawRecords([]);
      }

      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [classroomId, date]);

  const attendanceByPeriod = useMemo(() => {
    const map = new Map<number, StudentAttendanceRow[]>();
    for (const period of periodsForDay) {
      const rows: StudentAttendanceRow[] = allStudents.map((s) => {
        const record = rawRecords.find(
          (r) => r.schedule_period_id === period.id && r.student_id === s.id
        );
        return {
          student_id: s.id,
          student_name: s.name,
          schedule_period_id: period.id,
          status: record ? record.status : "present",
          record_id: record ? record.id : null,
        };
      });
      map.set(period.id, rows);
    }
    return map;
  }, [periodsForDay, allStudents, rawRecords]);

  const upsertStatus = useCallback(
    async (db: Awaited<ReturnType<typeof Database.load>>, studentId: number, periodId: number, status: AttendanceStatus) => {
      await db.execute(
        `INSERT INTO attendance_records (schedule_period_id, student_id, date, status)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(schedule_period_id, student_id, date)
         DO UPDATE SET status = excluded.status`,
        [periodId, studentId, date, status]
      );
    },
    [date]
  );

  const setStatus = useCallback(
    async (studentId: number, periodId: number, status: AttendanceStatus) => {
      const db = await Database.load(DB_URL);
      await upsertStatus(db, studentId, periodId, status);
      await fetchData();
    },
    [upsertStatus, fetchData]
  );

  const setStatusBulk = useCallback(
    async (studentIds: number[], periodId: number, status: AttendanceStatus) => {
      const db = await Database.load(DB_URL);
      await Promise.all(studentIds.map((sid) => upsertStatus(db, sid, periodId, status)));
      await fetchData();
    },
    [upsertStatus, fetchData]
  );

  const markEarlyPickup = useCallback(
    async (studentId: number, periodId: number) => {
      const targetPeriod = periodsForDay.find((p) => p.id === periodId);
      if (!targetPeriod) return;
      const db = await Database.load(DB_URL);
      await upsertStatus(db, studentId, periodId, "early_pickup");
      const laterPeriods = periodsForDay.filter(
        (p) => p.id !== periodId && p.start_time > targetPeriod.start_time
      );
      await Promise.all(laterPeriods.map((p) => upsertStatus(db, studentId, p.id, "absent")));
      await fetchData();
    },
    [periodsForDay, upsertStatus, fetchData]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { periodsForDay, attendanceByPeriod, allStudents, loading, error, setStatus, setStatusBulk, markEarlyPickup };
}
