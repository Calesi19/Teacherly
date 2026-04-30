import { View, Text, StyleSheet } from "@react-pdf/renderer";
import type { Student } from "../../types/student";
import { translations } from "../../i18n/translations";
import type { Language } from "../../i18n/translations";
import { formatReportDate, formatReportGender } from "../formatters";

const S = StyleSheet.create({
  section: { marginBottom: 28 },
  title: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: "#1a202c",
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e0",
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  field: { width: "50%", marginBottom: 8, paddingRight: 12 },
  label: { fontSize: 7.5, color: "#94a3b8", fontFamily: "Helvetica-Bold", marginBottom: 2, textTransform: "uppercase" },
  value: { fontSize: 9, color: "#1a202c" },
});

interface Props {
  student: Student;
  language: Language;
}

export function StudentProfileSection({ student, language }: Props) {
  const L = translations[language].reports.pdf;

  const fields: { label: string; value: string }[] = [
    { label: L.fieldFullName, value: student.name },
    { label: L.fieldGender, value: formatReportGender(student.gender, language) },
    { label: L.fieldDob, value: formatReportDate(student.birthdate, language) },
    { label: L.fieldStudentId, value: student.student_number ?? "—" },
    { label: L.fieldEnrollmentDate, value: formatReportDate(student.enrollment_date, language) },
    { label: L.fieldEnrollmentEndDate, value: formatReportDate(student.enrollment_end_date, language) },
  ];

  return (
    <View style={S.section}>
      <Text style={S.title}>{L.profile}</Text>
      <View style={S.grid}>
        {fields.map((f) => (
          <View key={f.label} style={S.field}>
            <Text style={S.label}>{f.label}</Text>
            <Text style={S.value}>{f.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
