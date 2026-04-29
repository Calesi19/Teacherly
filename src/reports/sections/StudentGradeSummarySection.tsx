import { View, Text, StyleSheet } from "@react-pdf/renderer";
import type { StudentCourseSummary } from "../fetchStudentReportData";
import { translations } from "../../i18n/translations";
import type { Language } from "../../i18n/translations";

const S = StyleSheet.create({
  section: { marginBottom: 28 },
  title: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: "#1a202c",
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e0",
  },
  thead: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderWidth: 0.5,
    borderColor: "#cbd5e0",
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: "#e2e8f0",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  hCell: { fontFamily: "Helvetica-Bold", fontSize: 8.5, color: "#374151" },
  hCellRight: { fontFamily: "Helvetica-Bold", fontSize: 8.5, color: "#374151", textAlign: "right" },
  cellCourse: { fontFamily: "Helvetica-Bold", fontSize: 8.5, color: "#1a202c", flex: 4 },
  cellScore: { fontSize: 8.5, color: "#374151", flex: 2, textAlign: "right" },
  cellPct: { fontSize: 8.5, color: "#374151", flex: 2, textAlign: "right" },
  cellGrade: { fontFamily: "Helvetica-Bold", fontSize: 8.5, flex: 1, textAlign: "right" },
  gradeA: { color: "#15803d" },
  gradeB: { color: "#16a34a" },
  gradeC: { color: "#b45309" },
  gradeD: { color: "#ea580c" },
  gradeF: { color: "#dc2626" },
  empty: { fontSize: 8.5, color: "#94a3b8", paddingVertical: 8, paddingHorizontal: 6 },
});

function gradeLetter(totalScore: number | null, totalMax: number): string {
  if (totalScore === null || totalMax === 0) return "—";
  const pct = (totalScore / totalMax) * 100;
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
    default: return {};
  }
}

interface Props {
  courses: StudentCourseSummary[];
  language: Language;
}

export function StudentGradeSummarySection({ courses, language }: Props) {
  const L = translations[language].reports.pdf;

  return (
    <View style={S.section}>
      <Text style={S.title}>{L.studentGradeSummary}</Text>
      {courses.length === 0 ? (
        <Text style={S.empty}>{L.noCourseSummary}</Text>
      ) : (
        <>
          <View style={S.thead}>
            <Text style={[S.hCell, { flex: 4 }]}>{L.colCourse}</Text>
            <Text style={[S.hCellRight, { flex: 2 }]}>{L.colScore}</Text>
            <Text style={[S.hCellRight, { flex: 2 }]}>%</Text>
            <Text style={[S.hCellRight, { flex: 1 }]}>{L.colGrade}</Text>
          </View>
          {courses.map((c) => {
            const grade = gradeLetter(c.totalScore, c.totalMax);
            const pct =
              c.totalScore !== null && c.totalMax > 0
                ? `${((c.totalScore / c.totalMax) * 100).toFixed(1)}%`
                : "—";
            const scoreStr =
              c.totalScore !== null ? `${c.totalScore}/${c.totalMax}` : "—";
            return (
              <View key={c.periodName} style={S.row}>
                <Text style={S.cellCourse}>{c.periodName}</Text>
                <Text style={S.cellScore}>{scoreStr}</Text>
                <Text style={S.cellPct}>{pct}</Text>
                <Text style={[S.cellGrade, gradeStyle(grade)]}>{grade}</Text>
              </View>
            );
          })}
        </>
      )}
    </View>
  );
}
