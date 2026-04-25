import { useState, useEffect, useCallback } from "react";
import Database from "@tauri-apps/plugin-sql";
import type { Student, UpdateStudentInput } from "../types/student";

const DB_URL = "sqlite:teacherly.db";

export function useStudentInfo(studentId: number) {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudent = useCallback(async () => {
    try {
      setLoading(true);
      const db = await Database.load(DB_URL);
      const rows = await db.select<Student[]>(
        "SELECT id, group_id, name, gender, birthdate, student_number, enrollment_date, enrollment_end_date, created_at FROM students WHERE id = ? AND is_deleted = 0 LIMIT 1",
        [studentId],
      );
      setStudent(rows[0] ?? null);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const save = useCallback(
    async (input: UpdateStudentInput) => {
      const db = await Database.load(DB_URL);
      await db.execute(
        "UPDATE students SET name=?, gender=?, birthdate=?, student_number=?, enrollment_date=?, enrollment_end_date=? WHERE id=?",
        [
          input.name,
          input.gender || null,
          input.birthdate || null,
          input.student_number || null,
          input.enrollment_date || null,
          input.enrollment_end_date || null,
          studentId,
        ],
      );
      await fetchStudent();
    },
    [studentId, fetchStudent],
  );

  useEffect(() => {
    fetchStudent();
  }, [fetchStudent]);

  return { student, loading, error, save };
}
