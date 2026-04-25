import { useState, useEffect, useCallback } from "react";
import Database from "@tauri-apps/plugin-sql";
import type { StudentAssignmentPreview } from "../types/assignment";

const DB_URL = "sqlite:teacherly.db";

export function useStudentAssignmentPreviews(studentId: number, groupId: number) {
  const [previews, setPreviews] = useState<StudentAssignmentPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPreviews = useCallback(async () => {
    try {
      setLoading(true);
      const db = await Database.load(DB_URL);
      const rows = await db.select<StudentAssignmentPreview[]>(
        `SELECT a.id AS assignment_id, a.title, a.period_name, a.max_score, s.score, a.created_at
         FROM assignments a
         LEFT JOIN assignment_scores s ON s.assignment_id = a.id AND s.student_id = ? AND s.is_deleted = 0
         WHERE a.group_id = ? AND a.is_deleted = 0
         ORDER BY a.created_at DESC`,
        [studentId, groupId]
      );
      setPreviews(rows);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [studentId, groupId]);

  useEffect(() => {
    fetchPreviews();
  }, [fetchPreviews]);

  return { previews, loading, error };
}
