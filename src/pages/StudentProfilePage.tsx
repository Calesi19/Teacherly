import { useState } from "react";
import {
  Avatar,
  Chip,
  Surface,
  ListBox,
  Spinner,
  Tabs,
  Button,
  Modal,
  Label,
  Input,
  Select,
  useOverlayState,
  DatePicker,
  DateField,
  Calendar,
  TableRoot,
  TableScrollContainer,
  TableContent,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/react";
import { parseDate } from "@internationalized/date";
import type { DateValue } from "@internationalized/date";
import { Breadcrumb } from "../components/Breadcrumb";
import { useContacts } from "../hooks/useContacts";
import { useNotes } from "../hooks/useNotes";
import { useVisitations } from "../hooks/useVisitations";
import { useStudentAssignmentPreviews } from "../hooks/useStudentAssignmentPreviews";
import { useStudentAttendance } from "../hooks/useStudentAttendance";
import type { DayAttendanceStatus } from "../types/attendance";
import { useTranslation } from "../i18n/LanguageContext";
import type { Group } from "../types/group";
import type { Student } from "../types/student";

interface StudentProfilePageProps {
  student: Student;
  group: Group;
  onGoToGroups: () => void;
  onGoToDashboard: () => void;
  onGoToStudents: () => void;
  onGoToContacts: () => void;
}

function InfoField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted uppercase tracking-wide">
        {label}
      </span>
      <span className="text-sm font-medium text-foreground">
        {value ?? <span className="text-foreground/30">—</span>}
      </span>
    </div>
  );
}

function getAge(birthdate: string): number {
  const birth = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function formatNoteTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatVisitDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function StudentProfilePage({
  student,
  group,
  onGoToGroups,
  onGoToDashboard,
  onGoToStudents,
  onGoToContacts,
}: StudentProfilePageProps) {
  const { t } = useTranslation();

  const todayDateValue = (): DateValue => {
    const d = new Date();
    return parseDate(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  };

  const [activeTab, setActiveTab] = useState("overview");

  const noteModalState = useOverlayState();
  const [noteContent, setNoteContent] = useState("");
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const visitationModalState = useOverlayState();
  const [selectedVisitorKey, setSelectedVisitorKey] = useState<string | null>(
    null,
  );
  const [newVisitorName, setNewVisitorName] = useState("");
  const [visitNotes, setVisitNotes] = useState("");
  const [visitedAt, setVisitedAt] = useState<DateValue | null>(
    todayDateValue(),
  );
  const [visitSubmitting, setVisitSubmitting] = useState(false);
  const [visitError, setVisitError] = useState<string | null>(null);

  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [assignmentPeriodFilter, setAssignmentPeriodFilter] = useState("all");
  const [noteSearch, setNoteSearch] = useState("");
  const [visitationSearch, setVisitationSearch] = useState("");

  const { contacts, loading: loadingContacts } = useContacts(student.id);
  const { notes, loading: loadingNotes, addNote } = useNotes(student.id);
  const {
    visitations,
    loading: loadingVisitations,
    addVisitation,
  } = useVisitations(student.id);
  const { previews: assignments, loading: loadingAssignments } =
    useStudentAssignmentPreviews(student.id, group.id);
  const {
    days: attendanceDays,
    summary: attendanceSummary,
    loading: loadingAttendance,
  } = useStudentAttendance(student.id);

  const assignmentPeriods = Array.from(
    new Set(assignments.map((a) => a.period_name)),
  ).sort();
  const filteredAssignments = assignments.filter((a) => {
    const matchesSearch = a.title
      .toLowerCase()
      .includes(assignmentSearch.toLowerCase());
    const matchesPeriod =
      assignmentPeriodFilter === "all" ||
      a.period_name === assignmentPeriodFilter;
    return matchesSearch && matchesPeriod;
  });
  const filteredNotes = notes.filter((n) =>
    n.content.toLowerCase().includes(noteSearch.toLowerCase()),
  );
  const filteredVisitations = visitations.filter((v) =>
    v.contact_name.toLowerCase().includes(visitationSearch.toLowerCase()),
  );

  const isNewVisitor = selectedVisitorKey === "new";
  const matchedContact =
    selectedVisitorKey && selectedVisitorKey !== "new"
      ? (contacts.find((c) => String(c.id) === selectedVisitorKey) ?? null)
      : null;
  const canSubmitVisitation =
    !visitSubmitting &&
    visitedAt !== null &&
    (isNewVisitor ? newVisitorName.trim().length > 0 : matchedContact !== null);

  const closeVisitationModal = () => {
    setSelectedVisitorKey(null);
    setNewVisitorName("");
    setVisitNotes("");
    setVisitedAt(todayDateValue());
    setVisitError(null);
    visitationModalState.close();
  };

  const handleAddVisitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitVisitation || !visitedAt) return;
    setVisitSubmitting(true);
    setVisitError(null);
    try {
      await addVisitation({
        contact_id: matchedContact ? matchedContact.id : null,
        visitor_name: isNewVisitor
          ? newVisitorName.trim()
          : (matchedContact?.name ?? ""),
        notes: visitNotes,
        visited_at: visitedAt.toString(),
      });
      closeVisitationModal();
    } catch (err) {
      setVisitError(String(err));
    } finally {
      setVisitSubmitting(false);
    }
  };

  const closeNoteModal = () => {
    setNoteContent("");
    setNoteError(null);
    noteModalState.close();
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    setNoteSubmitting(true);
    setNoteError(null);
    try {
      await addNote({ content: noteContent.trim() });
      setNoteContent("");
      noteModalState.close();
    } catch (err) {
      setNoteError(String(err));
    } finally {
      setNoteSubmitting(false);
    }
  };

  return (
    <div className="p-6 flex flex-col h-full">
      <Breadcrumb
        items={[
          { label: t("groups.breadcrumb"), onClick: onGoToGroups },
          { label: group.name, onClick: onGoToDashboard },
          { label: t("attendance.studentsHeader"), onClick: onGoToStudents },
          { label: student.name },
        ]}
      />

      <Tabs
        className="flex-1 flex flex-col min-h-0"
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(String(key))}
      >
        <div className="flex items-end justify-between mb-2">
          <div className="flex items-center gap-4">
            <Avatar size="lg">
              <Avatar.Fallback className="bg-accent text-white font-semibold">
                {student.name.charAt(0).toUpperCase()}
              </Avatar.Fallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{student.name}</h2>
              <p className="text-sm text-muted">
                {t("studentProfile.enrolled")}{" "}
                {new Date(student.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Tabs.ListContainer>
            <Tabs.List aria-label="Student sections">
              <Tabs.Tab id="overview">
                {t("studentProfile.tabs.overview")}
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="assignments">
                {t("studentProfile.tabs.assignments")}
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="attendance">
                {t("studentProfile.tabs.attendance")}
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="visitations">
                {t("studentProfile.tabs.visitations")}
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="notes">
                {t("studentProfile.tabs.notes")}
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
        </div>

        <Tabs.Panel className="pt-4 flex-1 overflow-y-auto" id="overview">
          <div className="flex flex-col gap-4">
            <Surface variant="default" className="rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">
                {t("studentProfile.overview.studentInfo")}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                <InfoField
                  label={t("studentProfile.overview.studentId")}
                  value={student.student_number}
                />
                <InfoField
                  label={t("studentProfile.overview.gender")}
                  value={student.gender}
                />
                <InfoField
                  label={t("studentProfile.overview.birthdate")}
                  value={
                    student.birthdate
                      ? new Date(student.birthdate).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric", year: "numeric" },
                        )
                      : null
                  }
                />
                <InfoField
                  label={t("studentProfile.overview.age")}
                  value={
                    student.birthdate
                      ? t("studentProfile.overview.ageYears", {
                          age: getAge(student.birthdate),
                        })
                      : null
                  }
                />
                <InfoField
                  label={t("studentProfile.overview.enrollmentDate")}
                  value={
                    student.enrollment_date
                      ? new Date(student.enrollment_date).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric", year: "numeric" },
                        )
                      : null
                  }
                />
              </div>
            </Surface>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Surface
                variant="default"
                className="rounded-2xl p-5 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted uppercase tracking-wide">
                    {t("studentProfile.overview.contacts")}
                  </h3>
                  <button
                    type="button"
                    onClick={onGoToContacts}
                    className="text-xs text-accent hover:underline"
                  >
                    {t("studentProfile.overview.viewAll")}
                  </button>
                </div>
                {loadingContacts ? (
                  <div className="flex justify-center py-4">
                    <Spinner size="sm" color="accent" />
                  </div>
                ) : contacts.length === 0 ? (
                  <p className="text-sm text-foreground/40">
                    {t("studentProfile.overview.noContacts")}
                  </p>
                ) : (
                  <ListBox
                    aria-label={t("studentProfile.overview.contacts")}
                    selectionMode="none"
                  >
                    {contacts.slice(0, 3).map((contact) => (
                      <ListBox.Item
                        key={contact.id}
                        id={contact.id}
                        textValue={contact.name}
                      >
                        <div className="flex flex-col py-0.5">
                          <span className="text-sm font-medium">
                            {contact.name}
                            {contact.is_emergency_contact ? (
                              <span className="ml-2 text-xs text-accent font-normal">
                                {t("studentProfile.overview.emergencyContact")}
                              </span>
                            ) : null}
                          </span>
                          {contact.relationship && (
                            <span className="text-xs text-muted">
                              {contact.relationship}
                            </span>
                          )}
                        </div>
                      </ListBox.Item>
                    ))}
                  </ListBox>
                )}
              </Surface>
            </div>
          </div>
        </Tabs.Panel>

        <Tabs.Panel
          className="pt-4 flex-1 min-h-0 flex flex-col"
          id="assignments"
        >
          {loadingAssignments ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" color="accent" />
            </div>
          ) : assignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center">
              <p className="text-lg font-semibold text-muted">
                {t("studentProfile.assignments.noAssignments")}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <Input
                  placeholder={t(
                    "studentProfile.assignments.searchPlaceholder",
                  )}
                  value={assignmentSearch}
                  onChange={(e) => setAssignmentSearch(e.target.value)}
                  className="max-w-xs"
                />
                <Select
                  aria-label={t("studentProfile.assignments.allPeriods")}
                  selectedKey={assignmentPeriodFilter}
                  onSelectionChange={(key) =>
                    setAssignmentPeriodFilter(String(key))
                  }
                  className="w-44"
                >
                  <Select.Trigger>
                    <Select.Value>
                      {({ selectedText, isPlaceholder }) =>
                        isPlaceholder
                          ? t("studentProfile.assignments.allPeriods")
                          : selectedText
                      }
                    </Select.Value>
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item
                        id="all"
                        textValue={t("studentProfile.assignments.allPeriods")}
                      >
                        {t("studentProfile.assignments.allPeriods")}
                      </ListBox.Item>
                      {assignmentPeriods.map((p) => (
                        <ListBox.Item key={p} id={p} textValue={p}>
                          {p}
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>
              {filteredAssignments.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-center">
                  <p className="text-lg font-semibold text-muted">
                    {t("studentProfile.assignments.noResults")}
                  </p>
                  <p className="text-sm text-foreground/40 mt-1">
                    {t("studentProfile.assignments.noResultsHint")}
                  </p>
                </div>
              ) : (
                <TableRoot variant="primary" className="flex-1 min-h-0">
                  <TableScrollContainer className="h-full">
                    <TableContent
                      aria-label={t("studentProfile.tabs.assignments")}
                    >
                      <TableHeader>
                        <TableColumn isRowHeader>
                          {t("studentProfile.assignments.columns.assignment")}
                        </TableColumn>
                        <TableColumn>
                          {t("studentProfile.assignments.columns.period")}
                        </TableColumn>
                        <TableColumn>
                          {t("studentProfile.assignments.columns.score")}
                        </TableColumn>
                        <TableColumn>
                          {t("studentProfile.assignments.columns.date")}
                        </TableColumn>
                      </TableHeader>
                      <TableBody>
                        {filteredAssignments.map((a) => (
                          <TableRow key={a.assignment_id} id={a.assignment_id}>
                            <TableCell className="font-medium">
                              {a.title}
                            </TableCell>
                            <TableCell className="text-sm text-foreground/50">
                              {a.period_name}
                            </TableCell>
                            <TableCell className="text-sm">
                              {a.score !== null ? (
                                <span
                                  className={
                                    a.score > a.max_score
                                      ? "text-warning"
                                      : "text-foreground"
                                  }
                                >
                                  {a.score}
                                </span>
                              ) : (
                                <span className="text-foreground/30">—</span>
                              )}
                              <span className="text-xs text-muted ml-0.5">
                                / {a.max_score}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-foreground/50 whitespace-nowrap">
                              {new Date(a.created_at).toLocaleDateString(
                                undefined,
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </TableContent>
                  </TableScrollContainer>
                </TableRoot>
              )}
            </>
          )}
        </Tabs.Panel>

        <Tabs.Panel
          className="pt-4 flex-1 min-h-0 flex flex-col gap-4"
          id="attendance"
        >
          {loadingAttendance ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" color="accent" />
            </div>
          ) : attendanceDays.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center">
              <p className="text-lg font-semibold text-muted">
                {t("studentProfile.attendance.noAttendance")}
              </p>
              <p className="text-sm text-foreground/40 mt-1">
                {t("studentProfile.attendance.noAttendanceHint")}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {(
                  [
                    {
                      key: "totalDays",
                      value: attendanceSummary.totalDays,
                      color: "text-foreground",
                    },
                    {
                      key: "present",
                      value: attendanceSummary.present,
                      color: "text-success",
                    },
                    {
                      key: "absent",
                      value: attendanceSummary.absent,
                      color: "text-danger",
                    },
                    {
                      key: "late",
                      value: attendanceSummary.late,
                      color: "text-warning",
                    },
                    {
                      key: "earlyPickup",
                      value: attendanceSummary.earlyPickup,
                      color: "text-foreground/60",
                    },
                    {
                      key: "lateArrival",
                      value: attendanceSummary.lateArrival,
                      color: "text-accent",
                    },
                  ] as { key: string; value: number; color: string }[]
                ).map(({ key, value, color }) => (
                  <Surface
                    key={key}
                    variant="default"
                    className="rounded-xl p-3 flex flex-col gap-0.5 text-center"
                  >
                    <span className={`text-xl font-bold ${color}`}>
                      {value}
                    </span>
                    <span className="text-xs text-muted">
                      {t(`studentProfile.attendance.summary.${key}`)}
                    </span>
                  </Surface>
                ))}
              </div>
              <TableRoot variant="primary" className="flex-1 min-h-0">
                <TableScrollContainer className="h-full">
                  <TableContent
                    aria-label={t("studentProfile.tabs.attendance")}
                  >
                    <TableHeader>
                      <TableColumn isRowHeader>
                        {t("studentProfile.attendance.columns.date")}
                      </TableColumn>
                      <TableColumn>
                        {t("studentProfile.attendance.columns.status")}
                      </TableColumn>
                      <TableColumn>
                        {t("studentProfile.attendance.columns.time")}
                      </TableColumn>
                      <TableColumn>
                        {t("studentProfile.attendance.columns.periods")}
                      </TableColumn>
                    </TableHeader>
                    <TableBody>
                      {attendanceDays.map((day) => {
                        const statusColors: Record<
                          DayAttendanceStatus,
                          string
                        > = {
                          present: "text-success",
                          absent: "text-danger",
                          late: "text-warning",
                          early_pickup: "text-foreground/60",
                          late_arrival: "text-accent",
                        };
                        return (
                          <TableRow key={day.date} id={day.date}>
                            <TableCell className="font-medium whitespace-nowrap">
                              {new Date(
                                day.date + "T12:00:00",
                              ).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`text-sm font-medium ${statusColors[day.dayStatus]}`}
                              >
                                {t(
                                  `studentProfile.attendance.status.${day.dayStatus}`,
                                )}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-foreground/50">
                              {day.time ?? "—"}
                            </TableCell>
                            <TableCell className="text-sm text-foreground/50">
                              {day.records.map((r) => r.period_name).join(", ")}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </TableContent>
                </TableScrollContainer>
              </TableRoot>
            </>
          )}
        </Tabs.Panel>

        <Tabs.Panel
          className="pt-4 flex-1 min-h-0 flex flex-col gap-4"
          id="visitations"
        >
          <div className="flex items-center justify-between">
            <Input
              placeholder={t("studentProfile.visitations.searchPlaceholder")}
              value={visitationSearch}
              onChange={(e) => setVisitationSearch(e.target.value)}
              className="max-w-xs"
            />
            <Button
              variant="primary"
              size="sm"
              onPress={visitationModalState.open}
            >
              {t("studentProfile.visitations.logVisitation")}
            </Button>
          </div>

          {loadingVisitations ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" color="accent" />
            </div>
          ) : visitations.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center">
              <p className="text-lg font-semibold text-muted">
                {t("studentProfile.visitations.noVisitations")}
              </p>
              <p className="text-sm text-foreground/40 mt-1">
                {t("studentProfile.visitations.noVisitationsHint")}
              </p>
            </div>
          ) : filteredVisitations.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center">
              <p className="text-lg font-semibold text-muted">
                {t("studentProfile.visitations.noResults")}
              </p>
              <p className="text-sm text-foreground/40 mt-1">
                {t("studentProfile.visitations.noResultsHint", {
                  search: visitationSearch,
                })}
              </p>
            </div>
          ) : (
            <TableRoot variant="primary" className="flex-1 min-h-0">
              <TableScrollContainer className="h-full">
                <TableContent aria-label={t("studentProfile.tabs.visitations")}>
                  <TableHeader>
                    <TableColumn isRowHeader>
                      {t("studentProfile.visitations.columns.notes")}
                    </TableColumn>
                    <TableColumn>
                      {t("studentProfile.visitations.columns.visitor")}
                    </TableColumn>
                    <TableColumn>
                      {t("studentProfile.visitations.columns.relationship")}
                    </TableColumn>
                    <TableColumn>
                      {t("studentProfile.visitations.columns.date")}
                    </TableColumn>
                  </TableHeader>
                  <TableBody>
                    {filteredVisitations.map((v) => (
                      <TableRow key={v.id} id={v.id}>
                        <TableCell className="text-sm text-foreground/50">
                          {v.notes || "—"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {v.contact_name}
                        </TableCell>
                        <TableCell className="text-sm text-foreground/50">
                          {v.contact_relationship || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-foreground/50 whitespace-nowrap">
                          {formatVisitDate(v.visited_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </TableContent>
              </TableScrollContainer>
            </TableRoot>
          )}
        </Tabs.Panel>

        <Tabs.Panel
          className="pt-4 flex-1 min-h-0 flex flex-col gap-4"
          id="notes"
        >
          <div className="flex items-center justify-between">
            <Input
              placeholder={t("studentProfile.notes.searchPlaceholder")}
              value={noteSearch}
              onChange={(e) => setNoteSearch(e.target.value)}
              className="max-w-xs"
            />
            <Button variant="primary" size="sm" onPress={noteModalState.open}>
              {t("studentProfile.notes.addNote")}
            </Button>
          </div>

          {loadingNotes ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" color="accent" />
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center">
              <p className="text-lg font-semibold text-muted">
                {t("studentProfile.notes.noNotes")}
              </p>
              <p className="text-sm text-foreground/40 mt-1">
                {t("studentProfile.notes.noNotesHint")}
              </p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center">
              <p className="text-lg font-semibold text-muted">
                {t("studentProfile.notes.noResults")}
              </p>
              <p className="text-sm text-foreground/40 mt-1">
                {t("studentProfile.notes.noResultsHint", {
                  search: noteSearch,
                })}
              </p>
            </div>
          ) : (
            <TableRoot variant="primary" className="flex-1 min-h-0">
              <TableScrollContainer className="h-full">
                <TableContent aria-label={t("studentProfile.tabs.notes")}>
                  <TableHeader>
                    <TableColumn isRowHeader>
                      {t("studentProfile.notes.columns.note")}
                    </TableColumn>
                    <TableColumn>
                      {t("studentProfile.notes.columns.date")}
                    </TableColumn>
                  </TableHeader>
                  <TableBody>
                    {filteredNotes.map((note) => (
                      <TableRow key={note.id} id={note.id}>
                        <TableCell className="text-sm text-foreground whitespace-pre-wrap max-w-md">
                          {note.content}
                        </TableCell>
                        <TableCell className="text-sm text-foreground/50 whitespace-nowrap">
                          {formatNoteTimestamp(note.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </TableContent>
              </TableScrollContainer>
            </TableRoot>
          )}
        </Tabs.Panel>
      </Tabs>

      <Modal state={noteModalState}>
        <Modal.Backdrop isDismissable={!noteSubmitting}>
          <Modal.Container>
            <Modal.Dialog>
              <form onSubmit={handleAddNote}>
                <Modal.Header>
                  {t("studentProfile.addNoteModal.title")}
                </Modal.Header>
                <Modal.Body className="flex flex-col gap-4 pb-px overflow-visible">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="note-content">
                      {t("studentProfile.addNoteModal.noteLabel")}
                    </Label>
                    <textarea
                      id="note-content"
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder={t(
                        "studentProfile.addNoteModal.notePlaceholder",
                      )}
                      rows={4}
                      required
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                    />
                  </div>
                  {noteError && (
                    <p className="text-danger text-sm">{noteError}</p>
                  )}
                </Modal.Body>
                <Modal.Footer>
                  <Button
                    type="button"
                    variant="ghost"
                    onPress={closeNoteModal}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isDisabled={noteSubmitting || !noteContent.trim()}
                  >
                    {noteSubmitting ? <Spinner size="sm" /> : t("common.add")}
                  </Button>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal state={visitationModalState}>
        <Modal.Backdrop isDismissable={!visitSubmitting}>
          <Modal.Container>
            <Modal.Dialog className="overflow-visible">
              <form onSubmit={handleAddVisitation}>
                <Modal.Header>
                  {t("studentProfile.logVisitationModal.title")}
                </Modal.Header>
                <Modal.Body className="flex flex-col gap-4 pb-px overflow-visible">
                  <div className="flex flex-col gap-1.5">
                    <Label>
                      {t("studentProfile.logVisitationModal.visitorLabel")}
                    </Label>
                    <Select
                      aria-label={t(
                        "studentProfile.logVisitationModal.visitorLabel",
                      )}
                      selectedKey={selectedVisitorKey}
                      onSelectionChange={(key) => {
                        setSelectedVisitorKey(key ? String(key) : null);
                        setNewVisitorName("");
                      }}
                    >
                      <Select.Trigger>
                        <Select.Value>
                          {({ isPlaceholder }) =>
                            isPlaceholder
                              ? t(
                                  "studentProfile.logVisitationModal.selectVisitor",
                                )
                              : undefined
                          }
                        </Select.Value>
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {contacts.map((c) => (
                            <ListBox.Item
                              key={c.id}
                              id={String(c.id)}
                              textValue={c.name}
                            >
                              <div className="flex flex-col">
                                <span className="text-sm">{c.name}</span>
                                {c.relationship && (
                                  <span className="text-xs text-foreground/50">
                                    {c.relationship}
                                  </span>
                                )}
                              </div>
                            </ListBox.Item>
                          ))}
                          <ListBox.Item
                            id="new"
                            textValue={t(
                              "studentProfile.logVisitationModal.newVisitor",
                            )}
                          >
                            <span className="text-accent text-sm">
                              {t(
                                "studentProfile.logVisitationModal.newVisitor",
                              )}
                            </span>
                          </ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>

                  {isNewVisitor && (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="visit-new-name">
                        {t(
                          "studentProfile.logVisitationModal.visitorNameLabel",
                        )}
                      </Label>
                      <Input
                        id="visit-new-name"
                        value={newVisitorName}
                        onChange={(e) => setNewVisitorName(e.target.value)}
                        placeholder={t(
                          "studentProfile.logVisitationModal.visitorNamePlaceholder",
                        )}
                        autoFocus
                      />
                      <p className="text-xs text-accent">
                        {t("studentProfile.logVisitationModal.newContactHint")}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <Label>
                      {t("studentProfile.logVisitationModal.dateLabel")}
                    </Label>
                    <DatePicker
                      className="w-full"
                      aria-label={t(
                        "studentProfile.logVisitationModal.dateLabel",
                      )}
                      value={visitedAt}
                      onChange={(date: DateValue | null) => setVisitedAt(date)}
                    >
                      <DateField.Group fullWidth>
                        <DateField.Input>
                          {(segment) => <DateField.Segment segment={segment} />}
                        </DateField.Input>
                        <DateField.Suffix>
                          <DatePicker.Trigger>
                            <DatePicker.TriggerIndicator />
                          </DatePicker.Trigger>
                        </DateField.Suffix>
                      </DateField.Group>
                      <DatePicker.Popover>
                        <Calendar
                          aria-label={t(
                            "studentProfile.logVisitationModal.dateLabel",
                          )}
                        >
                          <Calendar.Header>
                            <Calendar.YearPickerTrigger>
                              <Calendar.YearPickerTriggerHeading />
                              <Calendar.YearPickerTriggerIndicator />
                            </Calendar.YearPickerTrigger>
                            <Calendar.NavButton slot="previous" />
                            <Calendar.NavButton slot="next" />
                          </Calendar.Header>
                          <Calendar.Grid>
                            <Calendar.GridHeader>
                              {(day) => (
                                <Calendar.HeaderCell>{day}</Calendar.HeaderCell>
                              )}
                            </Calendar.GridHeader>
                            <Calendar.GridBody>
                              {(date) => <Calendar.Cell date={date} />}
                            </Calendar.GridBody>
                          </Calendar.Grid>
                          <Calendar.YearPickerGrid>
                            <Calendar.YearPickerGridBody>
                              {({ year }) => (
                                <Calendar.YearPickerCell year={year} />
                              )}
                            </Calendar.YearPickerGridBody>
                          </Calendar.YearPickerGrid>
                        </Calendar>
                      </DatePicker.Popover>
                    </DatePicker>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="visit-notes">
                      {t("studentProfile.logVisitationModal.notesLabel")}
                    </Label>
                    <textarea
                      id="visit-notes"
                      value={visitNotes}
                      onChange={(e) => setVisitNotes(e.target.value)}
                      placeholder={t(
                        "studentProfile.logVisitationModal.notesPlaceholder",
                      )}
                      rows={4}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                    />
                  </div>

                  {visitError && (
                    <p className="text-danger text-sm">{visitError}</p>
                  )}
                </Modal.Body>
                <Modal.Footer>
                  <Button
                    type="button"
                    variant="ghost"
                    onPress={closeVisitationModal}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isDisabled={!canSubmitVisitation}
                  >
                    {visitSubmitting ? <Spinner size="sm" /> : t("common.log")}
                  </Button>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
