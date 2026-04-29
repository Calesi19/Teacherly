import { useState, useEffect, useCallback } from "react";
import Database from "@tauri-apps/plugin-sql";
import type { Student, NewStudentInput } from "../types/student";

const DB_URL = "sqlite:teacherly.db";

interface UseStudentsOptions {
  enabled?: boolean;
}

export function useStudents(
  groupId: number | null,
  { enabled = true }: UseStudentsOptions = {},
) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    if (!enabled || groupId == null) {
      setStudents([]);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const db = await Database.load(DB_URL);
      const rows = await db.select<Student[]>(
        "SELECT s.id, s.group_id, s.name, s.gender, s.birthdate, s.student_number, s.enrollment_date, s.enrollment_end_date, s.created_at, ss.has_special_education FROM students s LEFT JOIN student_services ss ON ss.student_id = s.id AND ss.is_deleted = 0 WHERE s.group_id = ? AND s.is_deleted = 0 ORDER BY s.name ASC",
        [groupId]
      );
      setStudents(rows);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [enabled, groupId]);

  const addStudent = useCallback(
    async (input: NewStudentInput) => {
      if (groupId == null) throw new Error("Cannot add a student without a group");
      const db = await Database.load(DB_URL);
      await db.execute(
        "INSERT INTO students (group_id, name, gender, birthdate, student_number, enrollment_date) VALUES (?, ?, ?, ?, ?, ?)",
        [
          groupId,
          input.name,
          input.gender || null,
          input.birthdate || null,
          input.student_number || null,
          input.enrollment_date || null,
        ]
      );
      await fetchStudents();
    },
    [groupId, fetchStudents]
  );

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return { students, loading, error, addStudent };
}
