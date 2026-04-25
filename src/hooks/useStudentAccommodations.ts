import { useState, useEffect, useCallback } from "react";
import Database from "@tauri-apps/plugin-sql";
import type { StudentAccommodations, StudentAccommodationsInput } from "../types/studentAccommodations";

const DB_URL = "sqlite:teacherly.db";

export function useStudentAccommodations(studentId: number) {
  const [data, setData] = useState<StudentAccommodations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const db = await Database.load(DB_URL);
      const rows = await db.select<StudentAccommodations[]>(
        "SELECT id, student_id, desk_placement, extended_time, shorter_assignments, use_abacus, simple_instructions, visual_examples FROM student_accommodations WHERE student_id = ? AND is_deleted = 0 LIMIT 1",
        [studentId],
      );
      setData(rows[0] ?? null);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const save = useCallback(
    async (input: StudentAccommodationsInput) => {
      const db = await Database.load(DB_URL);
      await db.execute(
        `INSERT INTO student_accommodations (student_id, desk_placement, extended_time, shorter_assignments, use_abacus, simple_instructions, visual_examples)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(student_id) DO UPDATE SET
           desk_placement      = excluded.desk_placement,
           extended_time       = excluded.extended_time,
           shorter_assignments = excluded.shorter_assignments,
           use_abacus          = excluded.use_abacus,
           simple_instructions = excluded.simple_instructions,
           visual_examples     = excluded.visual_examples,
           is_deleted          = 0`,
        [
          studentId,
          input.desk_placement ? 1 : 0,
          input.extended_time ? 1 : 0,
          input.shorter_assignments ? 1 : 0,
          input.use_abacus ? 1 : 0,
          input.simple_instructions ? 1 : 0,
          input.visual_examples ? 1 : 0,
        ],
      );
      await fetchData();
    },
    [studentId, fetchData],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, save };
}
