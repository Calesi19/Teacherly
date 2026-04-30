import { View, Text, StyleSheet } from "@react-pdf/renderer";
import type { StudentGradeRow } from "../fetchStudentReportData";
import { translations } from "../../i18n/translations";
import type { Language } from "../../i18n/translations";
import { formatScore } from "../../lib/formatScore";

const S = StyleSheet.create({
  section: { marginBottom: 28 },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: "#1a202c",
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e0",
  },
  courseBlock: { marginBottom: 14 },
  courseLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    color: "#475569",
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: 0.4,
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
  cell: { fontSize: 8.5, color: "#374151" },
  cellRight: { fontSize: 8.5, color: "#374151", textAlign: "right" },
  cellBold: { fontFamily: "Helvetica-Bold", fontSize: 8.5, color: "#1a202c" },
  cellGrade: { fontFamily: "Helvetica-Bold", fontSize: 8.5, textAlign: "right" },
  colTitle: { flex: 4 },
  colScore: { flex: 2 },
  colGrade: { flex: 1 },
  gradeA: { color: "#15803d" },
  gradeB: { color: "#16a34a" },
  gradeC: { color: "#b45309" },
  gradeD: { color: "#ea580c" },
  gradeF: { color: "#dc2626" },
  footer: { paddingTop: 4, paddingHorizontal: 6, fontSize: 8, color: "#94a3b8" },
  empty: { fontSize: 8.5, color: "#94a3b8", paddingVertical: 8, paddingHorizontal: 6 },
});

function gradeLetter(score: number | null, maxScore: number): string {
  if (score === null) return "—";
  const pct = (score / maxScore) * 100;
  if (pct >= 90) return "A";
  if (pct >= 80) return "B";
  if (pct >= 70) return "C";
  if (pct >= 60) return "D";
  return "F";
}

function gradeStyle(grade: string) {
  if (grade === "A") return S.gradeA;
  if (grade === "B") return S.gradeB;
  if (grade === "C") return S.gradeC;
  if (grade === "D") return S.gradeD;
  if (grade === "F") return S.gradeF;
  return {};
}

interface Props {
  grades: StudentGradeRow[];
  periodFilter?: string;
  language: Language;
}

export function GradesSection({ grades, periodFilter, language }: Props) {
  const L = translations[language].reports.pdf;

  if (grades.length === 0) {
    return (
      <View style={S.section}>
        <Text style={S.sectionTitle}>
          {L.assignments}{periodFilter ? ` — ${periodFilter}` : ""}
        </Text>
        <Text style={S.empty}>
          {periodFilter
            ? L.noGradesForPeriod.replace("{period}", periodFilter)
            : L.noGrades}
        </Text>
      </View>
    );
  }

  // Build course groups: one table per course when showing all, one table when filtered
  const courseGroups: { name: string; rows: StudentGradeRow[] }[] = [];
  if (periodFilter) {
    courseGroups.push({ name: periodFilter, rows: grades });
  } else {
    const map = new Map<string, StudentGradeRow[]>();
    for (const g of grades) {
      if (!map.has(g.periodName)) map.set(g.periodName, []);
      map.get(g.periodName)!.push(g);
    }
    for (const [name, rows] of map) {
      courseGroups.push({ name, rows });
    }
  }

  return (
    <View style={S.section}>
      <Text style={S.sectionTitle}>
        {L.assignments}{periodFilter ? ` — ${periodFilter}` : ""}
      </Text>
      {courseGroups.map((group) => (
        <View key={group.name} style={S.courseBlock} wrap={false}>
          {!periodFilter && (
            <Text style={S.courseLabel}>{group.name}</Text>
          )}
          <View style={S.thead}>
            <Text style={[S.hCell, S.colTitle]}>{L.colAssignment}</Text>
            <Text style={[S.hCellRight, S.colScore]}>{L.colScore}</Text>
            <Text style={[S.hCellRight, S.colGrade]}>{L.colGrade}</Text>
          </View>
          {group.rows.map((g, i) => {
            const grade = gradeLetter(g.score, g.maxScore);
            return (
              <View key={i} style={S.row}>
                <Text style={[S.cellBold, S.colTitle]}>{g.assignmentTitle}</Text>
                <Text style={[S.cellRight, S.colScore]}>
                  {g.score !== null ? `${formatScore(g.score)} / ${formatScore(g.maxScore)}` : "—"}
                </Text>
                <Text style={[S.cellGrade, S.colGrade, gradeStyle(grade)]}>{grade}</Text>
              </View>
            );
          })}
          <Text style={S.footer}>
            {group.rows.length === 1
              ? L.assignmentCount.replace("{n}", "1")
              : L.assignmentCountPlural.replace("{n}", String(group.rows.length))}
          </Text>
        </View>
      ))}
    </View>
  );
}
