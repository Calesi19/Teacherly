import { useState, useEffect, useCallback } from "react";
import Database from "@tauri-apps/plugin-sql";
import type { Contact, NewContactInput } from "../types/contact";

const DB_URL = "sqlite:teacherly.db";

export function useContacts(studentId: number) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const db = await Database.load(DB_URL);
      const rows = await db.select<Contact[]>(
        "SELECT id, student_id, name, relationship, phone, email, is_emergency_contact, is_primary_guardian, created_at FROM contacts WHERE student_id = ? AND is_deleted = 0 ORDER BY is_primary_guardian DESC, is_emergency_contact DESC, name ASC",
        [studentId]
      );
      setContacts(rows);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const addContact = useCallback(
    async (input: NewContactInput) => {
      const db = await Database.load(DB_URL);
      await db.execute(
        "INSERT INTO contacts (student_id, name, relationship, phone, email, is_emergency_contact, is_primary_guardian) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [studentId, input.name, input.relationship || null, input.phone || null, input.email || null, input.is_emergency_contact ? 1 : 0, input.is_primary_guardian ? 1 : 0]
      );
      await fetchContacts();
    },
    [studentId, fetchContacts]
  );

  const updateContact = useCallback(
    async (id: number, input: NewContactInput) => {
      const db = await Database.load(DB_URL);
      await db.execute(
        "UPDATE contacts SET name=?, relationship=?, phone=?, email=?, is_emergency_contact=?, is_primary_guardian=? WHERE id=?",
        [input.name, input.relationship || null, input.phone || null, input.email || null, input.is_emergency_contact ? 1 : 0, input.is_primary_guardian ? 1 : 0, id]
      );
      await fetchContacts();
    },
    [fetchContacts]
  );

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  return { contacts, loading, error, addContact, updateContact };
}
