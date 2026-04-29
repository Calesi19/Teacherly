import { View, Text, StyleSheet } from "@react-pdf/renderer";
import type { StudentAttendanceSummary } from "../fetchStudentReportData";
import { translations } from "../../i18n/translations";
import type { Language } from "../../i18n/translations";

const S = StyleSheet.create({
  section: { marginBottom: 28 },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e0",
  },
  title: { fontFamily: "Helvetica-Bold", fontSize: 12, color: "#1a202c" },
  dateRange: { fontSize: 8, color: "#94a3b8" },
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
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  hCell: { fontFamily: "Helvetica-Bold", fontSize: 8.5, color: "#374151", textAlign: "right", flex: 1 },
  cell: { fontSize: 8.5, color: "#374151", textAlign: "right", flex: 1 },
  cellPresent: { fontSize: 8.5, color: "#15803d", textAlign: "right", flex: 1 },
  cellAbsent: { fontSize: 8.5, color: "#dc2626", textAlign: "right", flex: 1 },
  cellLate: { fontSize: 8.5, color: "#b45309", textAlign: "right", flex: 1 },
  cellPartial: { fontSize: 8.5, color: "#2563eb", textAlign: "right", flex: 1 },
  pctGood: { fontSize: 8.5, color: "#15803d", fontFamily: "Helvetica-Bold", textAlign: "right", flex: 1.5 },
  pctWarn: { fontSize: 8.5, color: "#b45309", fontFamily: "Helvetica-Bold", textAlign: "right", flex: 1.5 },
  pctBad: { fontSize: 8.5, color: "#dc2626", fontFamily: "Helvetica-Bold", textAlign: "right", flex: 1.5 },
  hCellPct: { fontFamily: "Helvetica-Bold", fontSize: 8.5, color: "#374151", textAlign: "right", flex: 1.5 },
});

function pct(num: number, total: number): string {
  if (total === 0) return "—";
  return ((num / total) * 100).toFixed(1) + "%";
}

interface Props {
  summary: StudentAttendanceSummary;
  dateFrom?: string;
  dateTo?: string;
  language: Language;
}

export function StudentAttendanceSummarySection({ summary, dateFrom, dateTo, language }: Props) {
  const L = translations[language].reports.pdf;

  let dateLabel = "";
  if (dateFrom && dateTo) dateLabel = `${dateFrom} – ${dateTo}`;
  else if (dateFrom) dateLabel = L.dateFrom.replace("{date}", dateFrom);
  else if (dateTo) dateLabel = L.dateTo.replace("{date}", dateTo);

  const attended = summary.present + summary.late + summary.partial;
  const attendancePct = summary.total > 0 ? (attended / summary.total) * 100 : 0;
  const pctStyle = attendancePct >= 90 ? S.pctGood : attendancePct >= 75 ? S.pctWarn : S.pctBad;

  return (
    <View style={S.section}>
      <View style={S.titleRow}>
        <Text style={S.title}>{L.studentAttendanceSummary}</Text>
        {dateLabel ? <Text style={S.dateRange}>{dateLabel}</Text> : null}
      </View>
      <View style={S.thead}>
        <Text style={[S.hCell]}>{L.colPresent}</Text>
        <Text style={[S.hCell]}>{L.colAbsent}</Text>
        <Text style={[S.hCell]}>{L.colLate}</Text>
        <Text style={[S.hCell]}>{L.colPartial}</Text>
        <Text style={[S.hCell]}>{L.colTotal}</Text>
        <Text style={[S.hCellPct]}>{L.colAttendancePct}</Text>
      </View>
      <View style={S.row}>
        <Text style={S.cellPresent}>{String(summary.present)}</Text>
        <Text style={S.cellAbsent}>{String(summary.absent)}</Text>
        <Text style={S.cellLate}>{String(summary.late)}</Text>
        <Text style={S.cellPartial}>{String(summary.partial)}</Text>
        <Text style={S.cell}>{String(summary.total)}</Text>
        <Text style={[pctStyle]}>{pct(attended, summary.total)}</Text>
      </View>
    </View>
  );
}
