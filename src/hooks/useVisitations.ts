import { useState, useEffect, useCallback } from "react";
import Database from "@tauri-apps/plugin-sql";
import type { Visitation, NewVisitationInput } from "../types/visitation";

const DB_URL = "sqlite:teacherly.db";

export function useVisitations(studentId: number) {
  const [visitations, setVisitations] = useState<Visitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVisitations = useCallback(async () => {
    try {
      setLoading(true);
      const db = await Database.load(DB_URL);
      const rows = await db.select<Visitation[]>(
        `SELECT v.id, v.student_id, v.contact_id, c.name AS contact_name, c.relationship AS contact_relationship, v.notes, v.visited_at, v.created_at
         FROM visitations v
         JOIN contacts c ON c.id = v.contact_id
         WHERE v.student_id = ? AND v.is_deleted = 0
         ORDER BY v.visited_at DESC, v.created_at DESC`,
        [studentId]
      );
      setVisitations(rows);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const addVisitation = useCallback(
    async (input: NewVisitationInput) => {
      const db = await Database.load(DB_URL);
      let contactId = input.contact_id;
      if (contactId === null) {
        const result = await db.execute(
          "INSERT INTO contacts (student_id, name) VALUES (?, ?)",
          [studentId, input.visitor_name.trim()]
        );
        contactId = result.lastInsertId ?? null;
      }
      await db.execute(
        "INSERT INTO visitations (student_id, contact_id, notes, visited_at) VALUES (?, ?, ?, ?)",
        [studentId, contactId, input.notes.trim() || null, input.visited_at]
      );
      await fetchVisitations();
    },
    [studentId, fetchVisitations]
  );

  useEffect(() => {
    fetchVisitations();
  }, [fetchVisitations]);

  return { visitations, loading, error, addVisitation };
}
