import { useState, useEffect, useCallback } from "react";
import Database from "@tauri-apps/plugin-sql";
import type { Assignment, NewAssignmentInput } from "../types/assignment";

const DB_URL = "sqlite:teacherly.db";

interface UseAssignmentsOptions {
  enabled?: boolean;
}

export function useAssignments(
  groupId: number | null,
  { enabled = true }: UseAssignmentsOptions = {},
) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = useCallback(async () => {
    if (!enabled || groupId == null) {
      setAssignments([]);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const db = await Database.load(DB_URL);
      const rows = await db.select<Assignment[]>(
        `SELECT a.id,
                a.group_id,
                a.period_name,
                a.assigned_date,
                a.title,
                a.description,
                a.max_score,
                a.tag,
                a.created_at,
                COALESCE(g.graded_count, 0) AS graded_count,
                COALESCE(s.student_count, 0) AS student_count
         FROM assignments a
         LEFT JOIN (
           SELECT assignment_id,
                  COUNT(*) AS graded_count
           FROM assignment_scores
           WHERE is_deleted = 0
             AND score IS NOT NULL
             AND COALESCE(exempt, 0) = 0
           GROUP BY assignment_id
         ) g ON g.assignment_id = a.id
         LEFT JOIN (
           SELECT group_id,
                  COUNT(*) AS student_count
           FROM students
           WHERE is_deleted = 0
           GROUP BY group_id
         ) s ON s.group_id = a.group_id
         WHERE a.group_id = ? AND a.is_deleted = 0
         ORDER BY a.assigned_date DESC, a.created_at DESC`,
        [groupId]
      );
      setAssignments(rows);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [enabled, groupId]);

  const addAssignment = useCallback(
    async (input: NewAssignmentInput) => {
      if (groupId == null) throw new Error("Cannot add an assignment without a group");
      const db = await Database.load(DB_URL);
      await db.execute(
        "INSERT INTO assignments (group_id, period_name, assigned_date, title, description, max_score, tag) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [groupId, input.period_name, input.assigned_date, input.title.trim(), input.description.trim() || null, input.max_score, input.tag]
      );
      await fetchAssignments();
    },
    [groupId, fetchAssignments]
  );

  const deleteAssignment = useCallback(
    async (id: number) => {
      const db = await Database.load(DB_URL);
      await db.execute("UPDATE assignments SET is_deleted = 1 WHERE id = ?", [id]);
      await fetchAssignments();
    },
    [fetchAssignments]
  );

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  return { assignments, loading, error, addAssignment, deleteAssignment };
}
