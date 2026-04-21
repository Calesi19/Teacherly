import { useState, useEffect, useCallback } from "react";
import Database from "@tauri-apps/plugin-sql";
import type { Note, NewNoteInput } from "../types/note";

const DB_URL = "sqlite:tizara.db";

export function useNotes(studentId: number) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const db = await Database.load(DB_URL);
      const rows = await db.select<Note[]>(
        "SELECT id, student_id, content, tags, created_at FROM student_notes WHERE student_id = ? AND is_deleted = 0 ORDER BY created_at DESC",
        [studentId]
      );
      setNotes(rows);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const addNote = useCallback(
    async (input: NewNoteInput) => {
      const db = await Database.load(DB_URL);
      await db.execute(
        "INSERT INTO student_notes (student_id, content, tags) VALUES (?, ?, ?)",
        [studentId, input.content, input.tags]
      );
      await fetchNotes();
    },
    [studentId, fetchNotes]
  );

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return { notes, loading, error, addNote };
}
