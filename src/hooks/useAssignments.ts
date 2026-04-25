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
        `SELECT id, group_id, period_name, title, description, max_score, tag, created_at
         FROM assignments
         WHERE group_id = ? AND is_deleted = 0
         ORDER BY created_at DESC`,
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
        "INSERT INTO assignments (group_id, period_name, title, description, max_score, tag) VALUES (?, ?, ?, ?, ?, ?)",
        [groupId, input.period_name, input.title.trim(), input.description.trim() || null, input.max_score, input.tag]
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
