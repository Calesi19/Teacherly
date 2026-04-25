import { useState, useEffect, useCallback } from "react";
import Database from "@tauri-apps/plugin-sql";
import type { StudentServices, StudentServicesInput } from "../types/studentServices";

const DB_URL = "sqlite:teacherly.db";

export function useStudentServices(studentId: number) {
  const [data, setData] = useState<StudentServices | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const db = await Database.load(DB_URL);
      const rows = await db.select<StudentServices[]>(
        "SELECT id, student_id, has_special_education, therapy_speech, therapy_occupational, therapy_psychological, therapy_physical, therapy_educational, medical_plan, has_treatment, allergies, conditions FROM student_services WHERE student_id = ? AND is_deleted = 0 LIMIT 1",
        [studentId],
      );
      setData(rows[0] ?? null);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const save = useCallback(
    async (input: StudentServicesInput) => {
      const db = await Database.load(DB_URL);
      await db.execute(
        `INSERT INTO student_services (student_id, has_special_education, therapy_speech, therapy_occupational, therapy_psychological, therapy_physical, therapy_educational, medical_plan, has_treatment, allergies, conditions)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(student_id) DO UPDATE SET
           has_special_education = excluded.has_special_education,
           therapy_speech        = excluded.therapy_speech,
           therapy_occupational  = excluded.therapy_occupational,
           therapy_psychological = excluded.therapy_psychological,
           therapy_physical      = excluded.therapy_physical,
           therapy_educational   = excluded.therapy_educational,
           medical_plan          = excluded.medical_plan,
           has_treatment         = excluded.has_treatment,
           allergies             = excluded.allergies,
           conditions            = excluded.conditions,
           is_deleted            = 0`,
        [
          studentId,
          input.has_special_education ? 1 : 0,
          input.therapy_speech ? 1 : 0,
          input.therapy_occupational ? 1 : 0,
          input.therapy_psychological ? 1 : 0,
          input.therapy_physical ? 1 : 0,
          input.therapy_educational ? 1 : 0,
          input.medical_plan,
          input.has_treatment ? 1 : 0,
          input.allergies.trim() || null,
          input.conditions.trim() || null,
        ],
      );
      await fetchData();
    },
    [studentId, fetchData],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, save };
}
