import { useState, useEffect, useCallback } from "react";
import Database from "@tauri-apps/plugin-sql";
import type { Address, NewAddressInput } from "../types/address";

const DB_URL = "sqlite:teacherly.db";

export function useAddresses(studentId: number) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAddresses = useCallback(async () => {
    try {
      setLoading(true);
      const db = await Database.load(DB_URL);
      const rows = await db.select<Address[]>(
        "SELECT id, student_id, label, street, city, state, zip_code, country, is_student_home, created_at FROM student_addresses WHERE student_id = ? AND is_deleted = 0 ORDER BY is_student_home DESC, created_at ASC",
        [studentId],
      );
      setAddresses(rows);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const addAddress = useCallback(
    async (input: NewAddressInput) => {
      const db = await Database.load(DB_URL);
      await db.execute(
        "INSERT INTO student_addresses (student_id, label, street, city, state, zip_code, country, is_student_home) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          studentId,
          input.label || null,
          input.street,
          input.city || null,
          input.state || null,
          input.zip_code || null,
          input.country || null,
          input.is_student_home ? 1 : 0,
        ],
      );
      await fetchAddresses();
    },
    [studentId, fetchAddresses],
  );

  const updateAddress = useCallback(
    async (id: number, input: NewAddressInput) => {
      const db = await Database.load(DB_URL);
      await db.execute(
        "UPDATE student_addresses SET label=?, street=?, city=?, state=?, zip_code=?, country=?, is_student_home=? WHERE id=?",
        [
          input.label || null,
          input.street,
          input.city || null,
          input.state || null,
          input.zip_code || null,
          input.country || null,
          input.is_student_home ? 1 : 0,
          id,
        ],
      );
      await fetchAddresses();
    },
    [fetchAddresses],
  );

  const deleteAddress = useCallback(
    async (id: number) => {
      const db = await Database.load(DB_URL);
      await db.execute(
        "UPDATE student_addresses SET is_deleted = 1 WHERE id = ?",
        [id],
      );
      await fetchAddresses();
    },
    [fetchAddresses],
  );

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  return { addresses, loading, error, addAddress, updateAddress, deleteAddress };
}
