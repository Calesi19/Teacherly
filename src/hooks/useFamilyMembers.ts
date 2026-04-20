import { useState, useEffect, useCallback } from "react";
import Database from "@tauri-apps/plugin-sql";
import type { FamilyMember, NewFamilyMemberInput } from "../types/familyMember";

const DB_URL = "sqlite:tizara.db";

export function useFamilyMembers(studentId: number) {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFamilyMembers = useCallback(async () => {
    try {
      setLoading(true);
      const db = await Database.load(DB_URL);
      const rows = await db.select<FamilyMember[]>(
        "SELECT id, student_id, name, relationship, phone, email, is_emergency_contact, created_at FROM family_members WHERE student_id = ? ORDER BY is_emergency_contact DESC, name ASC",
        [studentId]
      );
      setFamilyMembers(rows);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const addFamilyMember = useCallback(
    async (input: NewFamilyMemberInput) => {
      const db = await Database.load(DB_URL);
      await db.execute(
        "INSERT INTO family_members (student_id, name, relationship, phone, email, is_emergency_contact) VALUES (?, ?, ?, ?, ?, ?)",
        [studentId, input.name, input.relationship || null, input.phone || null, input.email || null, input.is_emergency_contact ? 1 : 0]
      );
      await fetchFamilyMembers();
    },
    [studentId, fetchFamilyMembers]
  );

  useEffect(() => {
    fetchFamilyMembers();
  }, [fetchFamilyMembers]);

  return { familyMembers, loading, error, addFamilyMember };
}
