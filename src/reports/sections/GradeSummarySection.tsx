import { View, Text, StyleSheet } from "@react-pdf/renderer";
import type { AssignmentReportData } from "../fetchGroupReportData";

const S = StyleSheet.create({
  section: { marginBottom: 28 },
  title: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: "#1a202c",
    marginBottom: 2,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e0",
  },
  subtitle: { fontSize: 8, color: "#94a3b8", marginBottom: 10 },
  assignmentBlock: { marginBottom: 16 },
  assignmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 4,
  },
  assignmentTitle: { fontFamily: "Helvetica-Bold", fontSize: 10, color: "#1e40af" },
  assignmentMeta: { fontSize: 8, color: "#64748b" },
  thead: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderWidth: 0.5,
    borderColor: "#cbd5e0",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: "#e2e8f0",
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  avgRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 3,
    paddingHorizontal: 6,
    borderTopWidth: 0.5,
    borderColor: "#e2e8f0",
  },
  hCell: { fontFamily: "Helvetica-Bold", fontSize: 8, color: "#374151", textAlign: "right" },
  hCellLeft: { fontFamily: "Helvetica-Bold", fontSize: 8, color: "#374151" },
  cellName: { fontFamily: "Helvetica-Bold", fontSize: 8.5, color: "#1a202c", flex: 5 },
  cellScore: { fontSize: 8.5, color: "#374151", flex: 2, textAlign: "right" },
  cellGrade: { fontFamily: "Helvetica-Bold", fontSize: 8.5, flex: 1, textAlign: "right" },
  avgLabel: { fontSize: 8, color: "#64748b" },
  avgValue: { fontFamily: "Helvetica-Bold", fontSize: 8, color: "#1a202c", marginLeft: 6 },
  noData: { fontSize: 9, color: "#94a3b8", paddingVertical: 10, paddingHorizontal: 6 },
  gradeA: { color: "#15803d" },
  gradeB: { color: "#166534" },
  gradeC: { color: "#92400e" },
  gradeD: { color: "#b45309" },
  gradeF: { color: "#dc2626" },
  gradeN: { color: "#94a3b8" },
});

function gradeLetter(score: number | null, max: number): string {
  if (score === null) return "—";
  const pct = (score / max) * 100;
  if (pct >= 90) return "A";
  if (pct >= 80) return "B";
  if (pct >= 70) return "C";
  if (pct >= 60) return "D";
  return "F";
}

function gradeStyle(letter: string) {
  switch (letter) {
    case "A": return S.gradeA;
    case "B": return S.gradeB;
    case "C": return S.gradeC;
    case "D": return S.gradeD;
    case "F": return S.gradeF;
    default: return S.gradeN;
  }
}

interface Props {
  assignments: AssignmentReportData[];
  periodFilter?: string;
}

export function GradeSummarySection({ assignments, periodFilter }: Props) {
  if (assignments.length === 0) {
    return (
      <View style={S.section}>
        <Text style={S.title}>Grade Summary</Text>
        <Text style={S.noData}>No assignments found{periodFilter ? ` for period "${periodFilter}"` : ""}.</Text>
      </View>
    );
  }

  return (
    <View style={S.section}>
      <Text style={S.title}>Grade Summary</Text>
      {periodFilter ? (
        <Text style={S.subtitle}>Period: {periodFilter}</Text>
      ) : null}

      {assignments.map((a) => {
        return (
          <View key={a.assignmentId} style={S.assignmentBlock} wrap={false}>
            <View style={S.assignmentHeader}>
              <Text style={S.assignmentTitle}>{a.title}</Text>
              <Text style={S.assignmentMeta}>
                {a.periodName} · Max: {a.maxScore} pts
              </Text>
            </View>

            <View style={S.thead}>
              <Text style={[S.hCellLeft, { flex: 5 }]}>Student</Text>
              <Text style={[S.hCell, { flex: 2 }]}>Score</Text>
              <Text style={[S.hCell, { flex: 1 }]}>Grade</Text>
            </View>

            {a.scores.map((s) => {
              const gl = gradeLetter(s.score, a.maxScore);
              return (
                <View key={s.studentId} style={S.row}>
                  <Text style={S.cellName}>{s.studentName}</Text>
                  <Text style={S.cellScore}>
                    {s.score !== null ? `${s.score} / ${a.maxScore}` : "—"}
                  </Text>
                  <Text style={[S.cellGrade, gradeStyle(gl)]}>{gl}</Text>
                </View>
              );
            })}

            <View style={S.avgRow}>
              <Text style={S.avgLabel}>Class average:</Text>
              <Text style={S.avgValue}>
                {a.average !== null
                  ? `${a.average.toFixed(1)} / ${a.maxScore} (${((a.average / a.maxScore) * 100).toFixed(1)}%)`
                  : "No scores yet"}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
