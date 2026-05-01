import { useState, useEffect, useCallback, useMemo } from "react";
import Database from "@tauri-apps/plugin-sql";
import type {
  CourseSummary,
  DayOfWeek,
  NewSchedulePeriodInput,
  SchedulePeriod,
} from "../types/schedule";

const DB_URL = "sqlite:teacherly.db";
const DEFAULT_COURSE_TIME = "00:00";
const DAY_ORDER: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];

export function useSchedule(groupId: number) {
  const [periods, setPeriods] = useState<SchedulePeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPeriods = useCallback(async () => {
    try {
      setLoading(true);
      const db = await Database.load(DB_URL);
      const rows = await db.select<SchedulePeriod[]>(
        "SELECT id, group_id, day_of_week, name, start_time, end_time, sort_order, created_at FROM schedule_periods WHERE group_id = ? AND is_deleted = 0 ORDER BY name ASC, day_of_week ASC, sort_order ASC",
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
      if (input.days.length === 0) throw new Error("Select at least one day.");
      const db = await Database.load(DB_URL);
      await Promise.all(
        input.days.map((day) => {
          const existing = periods.filter((p) => p.day_of_week === day);
          const sortOrder =
            existing.length > 0
              ? Math.max(...existing.map((p) => p.sort_order)) + 1
              : 0;
          return db.execute(
            "INSERT INTO schedule_periods (group_id, day_of_week, name, start_time, end_time, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
            [
              groupId,
              day,
              input.name,
              DEFAULT_COURSE_TIME,
              DEFAULT_COURSE_TIME,
              sortOrder,
            ],
          );
        }),
      );
      await fetchPeriods();
    },
    [groupId, periods, fetchPeriods]
  );

  const updatePeriod = useCallback(
    async (name: string, input: NewSchedulePeriodInput) => {
      if (input.days.length === 0) throw new Error("Select at least one day.");
      const db = await Database.load(DB_URL);
      const current = periods.filter((p) => p.name === name);
      const selectedDays = new Set(input.days);

      await db.execute(
        "UPDATE schedule_periods SET is_deleted = 1 WHERE group_id = ? AND name = ? AND is_deleted = 0 AND day_of_week NOT IN (" +
          input.days.map(() => "?").join(",") +
          ")",
        [groupId, name, ...input.days]
      );

      await Promise.all(
        current
          .filter((period) => selectedDays.has(period.day_of_week as DayOfWeek))
          .map((period) =>
            db.execute("UPDATE schedule_periods SET name = ? WHERE id = ?", [
              input.name,
              period.id,
            ]),
          ),
      );

      const existingDays = new Set(
        current.map((period) => period.day_of_week as DayOfWeek),
      );
      await Promise.all(
        input.days
          .filter((day) => !existingDays.has(day))
          .map((day) => {
            const existing = periods.filter((p) => p.day_of_week === day);
            const sortOrder =
              existing.length > 0
                ? Math.max(...existing.map((p) => p.sort_order)) + 1
                : 0;
            return db.execute(
              "INSERT INTO schedule_periods (group_id, day_of_week, name, start_time, end_time, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
              [
                groupId,
                day,
                input.name,
                DEFAULT_COURSE_TIME,
                DEFAULT_COURSE_TIME,
                sortOrder,
              ],
            );
          }),
      );

      if (name !== input.name) {
        await db.execute(
          "UPDATE assignments SET period_name = ? WHERE group_id = ? AND period_name = ? AND is_deleted = 0",
          [input.name, groupId, name],
        );
      }
      await fetchPeriods();
    },
    [groupId, periods, fetchPeriods]
  );

  const deletePeriod = useCallback(
    async (name: string) => {
      const db = await Database.load(DB_URL);
      await db.execute(
        "UPDATE schedule_periods SET is_deleted = 1 WHERE group_id = ? AND name = ?",
        [groupId, name],
      );
      await fetchPeriods();
    },
    [groupId, fetchPeriods]
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

  const courses = useMemo(() => {
    const map = new Map<string, CourseSummary>();
    for (const period of periods) {
      const day = period.day_of_week as DayOfWeek;
      const course = map.get(period.name) ?? {
        name: period.name,
        days: [],
        periodIds: [],
      };
      if (!course.days.includes(day)) course.days.push(day);
      course.periodIds.push(period.id);
      map.set(period.name, course);
    }

    return Array.from(map.values())
      .map((course) => ({
        ...course,
        days: [...course.days].sort(
          (a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b),
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [periods]);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  return {
    periods,
    courses,
    loading,
    error,
    addPeriod,
    updatePeriod,
    deletePeriod,
    periodsByDay,
  };
}
