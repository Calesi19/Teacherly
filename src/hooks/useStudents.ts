import { useState, useEffect, useCallback } from "react";
import Database from "@tauri-apps/plugin-sql";
import type { Student, NewStudentInput } from "../types/student";

const DB_URL = "sqlite:teacherly.db";

export function useStudents(groupId: number) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const db = await Database.load(DB_URL);
      const rows = await db.select<Student[]>(
        "SELECT id, group_id, name, gender, birthdate, student_number, enrollment_date, enrollment_end_date, created_at FROM students WHERE group_id = ? AND is_deleted = 0 ORDER BY name ASC",
        [groupId]
      );
      setStudents(rows);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  const addStudent = useCallback(
    async (input: NewStudentInput) => {
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
