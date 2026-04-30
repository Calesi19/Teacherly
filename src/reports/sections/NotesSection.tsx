import { View, Text, StyleSheet } from "@react-pdf/renderer";
import type { Note, NoteTagKey } from "../../types/note";
import { parseTags } from "../../types/note";
import { translations } from "../../i18n/translations";
import type { Language } from "../../i18n/translations";
import { formatReportDateTime } from "../formatters";

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
  noteBlock: {
    borderLeftWidth: 2,
    borderLeftColor: "#e2e8f0",
    paddingLeft: 8,
    marginBottom: 10,
  },
  noteMeta: { flexDirection: "row", alignItems: "center", marginBottom: 3, gap: 6 },
  noteDate: { fontSize: 7.5, color: "#94a3b8", fontFamily: "Helvetica-Bold" },
  tag: {
    fontSize: 7,
    color: "#4a5568",
    backgroundColor: "#edf2f7",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    marginRight: 3,
  },
  noteContent: { fontSize: 8.5, color: "#374151", lineHeight: 1.4 },
  empty: { fontSize: 8.5, color: "#94a3b8" },
  footer: { paddingTop: 4, fontSize: 8, color: "#94a3b8" },
});

interface Props {
  notes: Note[];
  tagFilter?: string;
  language: Language;
}

export function NotesSection({ notes, tagFilter, language }: Props) {
  const L = translations[language].reports.pdf;

  const TAG_LABELS: Record<NoteTagKey, string> = {
    incident: L.tagIncident,
    positive: L.tagPositive,
    negative: L.tagNegative,
    health: L.tagHealth,
    attendance: L.tagAttendance,
    referral: L.tagReferral,
  };

  const filterLabel = tagFilter ? TAG_LABELS[tagFilter as NoteTagKey] ?? tagFilter : null;

  const countLabel = notes.length === 1
    ? L.noteCount.replace("{n}", String(notes.length))
    : L.noteCountPlural.replace("{n}", String(notes.length));

  return (
    <View style={S.section}>
      <Text style={S.title}>
        {L.notes}{filterLabel ? ` — ${filterLabel}` : ""}
      </Text>
      {notes.length === 0 ? (
        <Text style={S.empty}>
          {filterLabel
            ? L.noNotesTagged.replace("{tag}", filterLabel)
            : L.noNotes}
        </Text>
      ) : (
        notes.map((note) => {
          const tags = parseTags(note.tags);
          return (
            <View key={note.id} style={S.noteBlock}>
              <View style={S.noteMeta}>
                <Text style={S.noteDate}>
                  {formatReportDateTime(note.created_at, language)}
                </Text>
                {tags.map((t) => (
                  <Text key={t} style={S.tag}>{TAG_LABELS[t]}</Text>
                ))}
              </View>
              <Text style={S.noteContent}>{note.content}</Text>
            </View>
          );
        })
      )}
      <Text style={S.footer}>
        {countLabel}
        {filterLabel ? L.noteMatchingTag.replace("{tag}", filterLabel) : ""}
      </Text>
    </View>
  );
}
