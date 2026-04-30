import { View, Text, StyleSheet } from "@react-pdf/renderer";
import type { Student } from "../../types/student";
import { translations } from "../../i18n/translations";
import type { Language } from "../../i18n/translations";
import { formatReportGender } from "../formatters";

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
  footer: {
    paddingTop: 4,
    paddingHorizontal: 6,
    fontSize: 8,
    color: "#94a3b8",
  },
  hCell: { fontFamily: "Helvetica-Bold", fontSize: 8.5, color: "#374151" },
  cell: { fontSize: 8.5, color: "#374151" },
  cellBold: { fontFamily: "Helvetica-Bold", fontSize: 8.5, color: "#1a202c" },
  colName: { flex: 3 },
  colGender: { flex: 1 },
  colBirthdate: { flex: 2 },
  colId: { flex: 2 },
  colEnrolled: { flex: 2 },
});

function fmt(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m, 10) - 1]} ${parseInt(day, 10)}, ${y}`;
}

interface Props {
  students: Student[];
  language: Language;
}

export function StudentRosterSection({ students, language }: Props) {
  const L = translations[language].reports.pdf;
  const countLabel = students.length === 1
    ? L.studentCount.replace("{n}", String(students.length))
    : L.studentCountPlural.replace("{n}", String(students.length));

  return (
    <View style={S.section}>
      <Text style={S.title}>{L.roster}</Text>
      <View style={S.thead}>
        <Text style={[S.hCell, S.colName]}>{L.colName}</Text>
        <Text style={[S.hCell, S.colGender]}>{L.colGender}</Text>
        <Text style={[S.hCell, S.colBirthdate]}>{L.colBirthdate}</Text>
        <Text style={[S.hCell, S.colId]}>{L.colStudentId}</Text>
        <Text style={[S.hCell, S.colEnrolled]}>{L.colEnrolled}</Text>
      </View>
      {students.map((s) => (
        <View key={s.id} style={S.row}>
          <Text style={[S.cellBold, S.colName]}>{s.name}</Text>
          <Text style={[S.cell, S.colGender]}>
            {formatReportGender(s.gender, language)}
          </Text>
          <Text style={[S.cell, S.colBirthdate]}>{fmt(s.birthdate)}</Text>
          <Text style={[S.cell, S.colId]}>{s.student_number ?? "—"}</Text>
          <Text style={[S.cell, S.colEnrolled]}>{fmt(s.enrollment_date)}</Text>
        </View>
      ))}
      <Text style={S.footer}>{countLabel}</Text>
    </View>
  );
}
