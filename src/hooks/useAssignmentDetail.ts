import { useState, useEffect, useCallback, useMemo } from "react";
import Database from "@tauri-apps/plugin-sql";
import type { AssignmentScore, GradeDistribution } from "../types/assignment";

const DB_URL = "sqlite:tizara.db";

interface AssignmentStats {
  gradedCount: number;
  average: number | null;
  distribution: GradeDistribution[];
}

function computeStats(scores: AssignmentScore[], maxScore: number): AssignmentStats {
  const total = scores.length;
  const graded = scores.filter((s) => s.score !== null);
  const gradedCount = graded.length;
  const notScoredCount = total - gradedCount;

  const average =
    gradedCount > 0
      ? graded.reduce((acc, s) => acc + s.score!, 0) / gradedCount
      : null;

  const bandCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const s of graded) {
    const pct = (s.score! / maxScore) * 100;
    if (pct >= 90) bandCounts.A++;
    else if (pct >= 80) bandCounts.B++;
    else if (pct >= 70) bandCounts.C++;
    else if (pct >= 60) bandCounts.D++;
    else bandCounts.F++;
  }

  const distribution: GradeDistribution[] = (["A", "B", "C", "D", "F"] as const)
    .filter((band) => bandCounts[band] > 0)
    .map((band) => ({
      band,
      count: bandCounts[band],
      percentage: total > 0 ? (bandCounts[band] / total) * 100 : 0,
    }));

  if (notScoredCount > 0) {
    distribution.push({
      band: "N",
      count: notScoredCount,
      percentage: total > 0 ? (notScoredCount / total) * 100 : 100,
    });
  }

  return { gradedCount, average, distribution };
}

export function useAssignmentDetail(assignmentId: number, groupId: number, maxScore: number) {
  const [scores, setScores] = useState<AssignmentScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScores = useCallback(async () => {
    try {
      setLoading(true);
      const db = await Database.load(DB_URL);
      const rows = await db.select<AssignmentScore[]>(
        `SELECT COALESCE(s2.id, 0) AS id,
                ? AS assignment_id,
                st.id AS student_id,
                st.name AS student_name,
                s2.score AS score
         FROM students st
         LEFT JOIN assignment_scores s2
           ON s2.assignment_id = ? AND s2.student_id = st.id AND s2.is_deleted = 0
         WHERE st.group_id = ? AND st.is_deleted = 0
         ORDER BY st.name ASC`,
        [assignmentId, assignmentId, groupId]
      );
      setScores(rows);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [assignmentId, groupId]);

  const upsertScore = useCallback(
    async (studentId: number, score: number | null) => {
      const db = await Database.load(DB_URL);
      await db.execute(
        `INSERT INTO assignment_scores (assignment_id, student_id, score) VALUES (?, ?, ?)
         ON CONFLICT(assignment_id, student_id) DO UPDATE SET score = excluded.score, is_deleted = 0`,
        [assignmentId, studentId, score]
      );
      await fetchScores();
    },
    [assignmentId, fetchScores]
  );

  const stats = useMemo(() => computeStats(scores, maxScore), [scores, maxScore]);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  return { scores, loading, error, upsertScore, stats };
}
