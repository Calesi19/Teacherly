import { useState, useEffect, useCallback, useMemo } from "react";
import Database from "@tauri-apps/plugin-sql";
import type { SchedulePeriod, NewSchedulePeriodInput } from "../types/schedule";

const DB_URL = "sqlite:teacherly.db";

export function useSchedule(groupId: number) {
  const [periods, setPeriods] = useState<SchedulePeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPeriods = useCallback(async () => {
    try {
      setLoading(true);
      const db = await Database.load(DB_URL);
      const rows = await db.select<SchedulePeriod[]>(
        "SELECT id, group_id, day_of_week, name, start_time, end_time, sort_order, created_at FROM schedule_periods WHERE group_id = ? AND is_deleted = 0 ORDER BY day_of_week ASC, sort_order ASC, start_time ASC",
        [groupId]
      );
      setPeriods(rows);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  const addPeriod = useCallback(
    async (input: NewSchedulePeriodInput) => {
      const db = await Database.load(DB_URL);
      const existing = periods.filter((p) => p.day_of_week === input.day_of_week);
      const sortOrder = existing.length > 0 ? Math.max(...existing.map((p) => p.sort_order)) + 1 : 0;
      await db.execute(
        "INSERT INTO schedule_periods (group_id, day_of_week, name, start_time, end_time, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
        [groupId, input.day_of_week, input.name, input.start_time, input.end_time, sortOrder]
      );
      await fetchPeriods();
    },
    [groupId, periods, fetchPeriods]
  );

  const updatePeriod = useCallback(
    async (id: number, input: { name: string; start_time: string; end_time: string }) => {
      const db = await Database.load(DB_URL);
      await db.execute(
        "UPDATE schedule_periods SET name=?, start_time=?, end_time=? WHERE id=?",
        [input.name, input.start_time, input.end_time, id]
      );
      await fetchPeriods();
    },
    [fetchPeriods]
  );

  const deletePeriod = useCallback(
    async (id: number) => {
      const db = await Database.load(DB_URL);
      await db.execute("UPDATE schedule_periods SET is_deleted = 1 WHERE id = ?", [id]);
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

  return { periods, loading, error, addPeriod, updatePeriod, deletePeriod, periodsByDay };
}
