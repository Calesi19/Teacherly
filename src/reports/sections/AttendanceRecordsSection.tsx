import { View, Text, StyleSheet } from "@react-pdf/renderer";
import type { AttendanceRecordRow } from "../fetchStudentReportData";
import { translations } from "../../i18n/translations";
import type { Language } from "../../i18n/translations";
import { formatReportDate } from "../formatters";

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
  cell: { fontSize: 8.5, color: "#374151" },
  colDate: { flex: 2 },
  colPeriod: { flex: 2 },
  colStatus: { flex: 1.5 },
  colNotes: { flex: 3 },
  statusPresent: { color: "#15803d" },
  statusAbsent: { color: "#dc2626" },
  statusLate: { color: "#b45309" },
  statusEarly: { color: "#2563eb" },
  footer: { paddingTop: 4, paddingHorizontal: 6, fontSize: 8, color: "#94a3b8" },
  empty: { fontSize: 8.5, color: "#94a3b8", paddingVertical: 8, paddingHorizontal: 6 },
});

function statusStyle(status: string) {
  if (status === "present") return S.statusPresent;
  if (status === "absent") return S.statusAbsent;
  if (status === "late") return S.statusLate;
  return S.statusEarly;
}

interface Props {
  records: AttendanceRecordRow[];
  dateFrom?: string;
  dateTo?: string;
  language: Language;
}

export function AttendanceRecordsSection({ records, dateFrom, dateTo, language }: Props) {
  const L = translations[language].reports.pdf;

  const STATUS_LABELS: Record<string, string> = {
    present: L.statusPresent,
    absent: L.statusAbsent,
    late: L.statusLate,
    early_pickup: L.statusEarlyPickup,
  };

  const rangeLabel =
    dateFrom || dateTo
      ? ` (${dateFrom ? formatReportDate(dateFrom, language) : L.rangeStart} – ${dateTo ? formatReportDate(dateTo, language) : L.rangeToday})`
      : "";

  const countLabel = records.length === 1
    ? L.recordCount.replace("{n}", String(records.length))
    : L.recordCountPlural.replace("{n}", String(records.length));

  return (
    <View style={S.section}>
      <Text style={S.title}>{L.attendanceRecords}{rangeLabel}</Text>
      <View style={S.thead}>
        <Text style={[S.hCell, S.colDate]}>{L.colDate}</Text>
        <Text style={[S.hCell, S.colPeriod]}>{L.colPeriod}</Text>
        <Text style={[S.hCell, S.colStatus]}>{L.colStatus}</Text>
        <Text style={[S.hCell, S.colNotes]}>{L.colNotes}</Text>
      </View>
      {records.length === 0 ? (
        <Text style={S.empty}>
          {rangeLabel ? L.noAttendanceRecordsRange : L.noAttendanceRecords}
        </Text>
      ) : (
        records.map((r, i) => (
          <View key={i} style={S.row}>
            <Text style={[S.cell, S.colDate]}>
              {formatReportDate(r.date, language)}
            </Text>
            <Text style={[S.cell, S.colPeriod]}>{r.periodName}</Text>
            <Text style={[S.cell, S.colStatus, statusStyle(r.status)]}>
              {STATUS_LABELS[r.status] ?? r.status}
            </Text>
            <Text style={[S.cell, S.colNotes]}>{r.notes ?? "—"}</Text>
          </View>
        ))
      )}
      <Text style={S.footer}>{countLabel}</Text>
    </View>
  );
}
