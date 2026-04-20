import { useState, useEffect, useCallback, useMemo } from "react";
import Database from "@tauri-apps/plugin-sql";
import type { SchedulePeriod, NewSchedulePeriodInput } from "../types/schedule";

const DB_URL = "sqlite:tizara.db";

export function useSchedule(classroomId: number) {
  const [periods, setPeriods] = useState<SchedulePeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPeriods = useCallback(async () => {
    try {
      setLoading(true);
      const db = await Database.load(DB_URL);
      const rows = await db.select<SchedulePeriod[]>(
        "SELECT id, classroom_id, day_of_week, name, start_time, end_time, sort_order, created_at FROM schedule_periods WHERE classroom_id = ? ORDER BY day_of_week ASC, sort_order ASC, start_time ASC",
        [classroomId]
      );
      setPeriods(rows);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [classroomId]);

  const addPeriod = useCallback(
    async (input: NewSchedulePeriodInput) => {
      const db = await Database.load(DB_URL);
      const existing = periods.filter((p) => p.day_of_week === input.day_of_week);
      const sortOrder = existing.length > 0 ? Math.max(...existing.map((p) => p.sort_order)) + 1 : 0;
      await db.execute(
        "INSERT INTO schedule_periods (classroom_id, day_of_week, name, start_time, end_time, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
        [classroomId, input.day_of_week, input.name, input.start_time, input.end_time, sortOrder]
      );
      await fetchPeriods();
    },
    [classroomId, periods, fetchPeriods]
  );

  const deletePeriod = useCallback(
    async (id: number) => {
      const db = await Database.load(DB_URL);
      await db.execute("DELETE FROM schedule_periods WHERE id = ?", [id]);
      await fetchPeriods();
    },
    [fetchPeriods]
  );

  const periodsByDay = useMemo(() => {
    const map = new Map<number, SchedulePeriod[]>();
    for (const p of periods) {
      const arr = map.get(p.day_of_week) ?? [];
      arr.push(p);
      map.set(p.day_of_week, arr);
    }
    return map;
  }, [periods]);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  return { periods, loading, error, addPeriod, deletePeriod, periodsByDay };
}
