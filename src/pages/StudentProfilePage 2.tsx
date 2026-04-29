import { useState, useCallback } from "react";
import {
  Avatar,
  EmptyState,
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
  Tooltip,
} from "@heroui/react";
import { parseDate } from "@internationalized/date";
import type { DateValue } from "@internationalized/date";
import { Ambulance, Inbox, Pencil, ShieldUser, Star } from "lucide-react";
import { Breadcrumb } from "../components/Breadcrumb";
import { useStudentInfo } from "../hooks/useStudentInfo";
import { useContacts } from "../hooks/useContacts";
import { useAddresses } from "../hooks/useAddresses";
import { useStudentServices } from "../hooks/useStudentServices";
import { useStudentAccommodations } from "../hooks/useStudentAccommodations";
import { useStudentObservations } from "../hooks/useStudentObservations";
import { useNotes } from "../hooks/useNotes";
import { useVisitations } from "../hooks/useVisitations";
import { useStudentAssignmentPreviews } from "../hooks/useStudentAssignmentPreviews";
import { useStudentAttendance } from "../hooks/useStudentAttendance";
import type { DayAttendanceStatus } from "../types/attendance";
import { NOTE_TAG_KEYS, NOTE_TAG_COLORS, type NoteTagKey, type Note, parseTags, serializeTags } from "../types/note";
import { useTranslation } from "../i18n/LanguageContext";
import type { Group } from "../types/group";
import type { Student } from "../types/student";

interface StudentProfilePageProps {
  student: Student;
  group: Group;
  onGoToGroups: () => void;
  onGoToStudents: () => void;
  onGoToStudentInfo: () => void;
  onGoToContacts: () => void;
  onGoToAddresses: () => void;
  onGoToServices: () => void;
  onGoToAccommodations: () => void;
  onGoToObservations: () => void;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-1.5 inline-flex items-center text-foreground/30 hover:text-foreground/70 transition-colors"
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
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
  onGoToStudents,
  onGoToStudentInfo,
  onGoToContacts,
  onGoToAddresses,
  onGoToServices,
  onGoToAccommodations,
  onGoToObservations,
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
  const [noteTags, setNoteTags] = useState<NoteTagKey[]>([]);
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const viewNoteModalState = useOverlayState();
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editNoteContent, setEditNoteContent] = useState("");
  const [editNoteTags, setEditNoteTags] = useState<NoteTagKey[]>([]);
  const [editNoteSubmitting, setEditNoteSubmitting] = useState(false);
  const [editNoteError, setEditNoteError] = useState<string | null>(null);

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
  const [noteTagFilter, setNoteTagFilter] = useState<"all" | NoteTagKey>("all");
  const [visitationSearch, setVisitationSearch] = useState("");

  const { student: freshStudent } = useStudentInfo(student.id);
  const s = freshStudent ?? student;
  const { contacts, loading: loadingContacts } = useContacts(student.id);
  const { addresses, loading: loadingAddresses } = useAddresses(student.id);
  const { data: services, loading: loadingServices } = useStudentServices(student.id);
  const { data: accommodations, loading: loadingAccommodations } = useStudentAccommodations(student.id);
  const { data: observations, loading: loadingObservations } = useStudentObservations(student.id);
  const { notes, loading: loadingNotes, addNote, updateNote } = useNotes(student.id);
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
  const [attendanceFilter, setAttendanceFilter] = useState<"totalDays" | "present" | "absent" | "late" | "partial" | null>(null);

  const filteredAttendanceDays = attendanceDays.filter((d) => {
    if (!attendanceFilter || attendanceFilter === "totalDays") return true;
    if (attendanceFilter === "present") return d.dayStatus === "present" || d.dayStatus === "late";
    return d.dayStatus === attendanceFilter;
  });

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
  const filteredNotes = notes.filter((n) => {
    const q = noteSearch.toLowerCase();
    const matchesSearch = n.content.toLowerCase().includes(q) || n.tags.toLowerCase().includes(q);
    const matchesTag = noteTagFilter === "all" || parseTags(n.tags).includes(noteTagFilter);
    return matchesSearch && matchesTag;
  });
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
    setNoteTags([]);
    setNoteError(null);
    noteModalState.close();
  };

  const openViewNoteModal = (note: Note) => {
    setViewingNote(note);
    setIsEditingNote(false);
    setEditNoteError(null);
    viewNoteModalState.open();
  };

  const closeViewNoteModal = () => {
    setIsEditingNote(false);
    setEditNoteError(null);
    viewNoteModalState.close();
  };

  const startEditingNote = () => {
    if (!viewingNote) return;
    setEditNoteContent(viewingNote.content);
    setEditNoteTags(parseTags(viewingNote.tags));
    setEditNoteError(null);
    setIsEditingNote(true);
  };

  const handleEditNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingNote || !editNoteContent.trim()) return;
    setEditNoteSubmitting(true);
    setEditNoteError(null);
    try {
      await updateNote(viewingNote.id, { content: editNoteContent.trim(), tags: serializeTags(editNoteTags) });
      setViewingNote((prev) => prev ? { ...prev, content: editNoteContent.trim(), tags: serializeTags(editNoteTags) } : prev);
      setIsEditingNote(false);
    } catch (err) {
      setEditNoteError(String(err));
    } finally {
      setEditNoteSubmitting(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    setNoteSubmitting(true);
    setNoteError(null);
    try {
      await addNote({ content: noteContent.trim(), tags: serializeTags(noteTags) });
      setNoteContent("");
      setNoteTags([]);
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
          { label: group.name, onClick: onGoToStudents },
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-muted uppercase tracking-wide">
                  {t("studentProfile.overview.studentInfo")}
                </h3>
                <button
                  type="button"
                  onClick={onGoToStudentInfo}
                  className="inline-flex items-center gap-1 text-xs text-foreground/40 hover:text-foreground/70 transition-colors"
                  aria-label="Edit student info"
                >
                  <Pencil size={12} />
                  {t("common.edit")}
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                <InfoField
                  label={t("studentProfile.overview.studentId")}
                  value={
                    s.student_number ? (
                      <span className="inline-flex items-center leading-none">
                        {s.student_number}
                        <CopyButton value={s.student_number} />
                      </span>
                    ) : null
                  }
                />
                <InfoField
                  label={t("studentProfile.overview.gender")}
                  value={s.gender}
                />
                <InfoField
                  label={t("studentProfile.overview.birthdate")}
                  value={
                    s.birthdate
                      ? new Date(s.birthdate).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric", year: "numeric" },
                        )
                      : null
                  }
                />
                <InfoField
                  label={t("studentProfile.overview.age")}
                  value={
                    s.birthdate
                      ? t("studentProfile.overview.ageYears", {
                          age: getAge(s.birthdate),
                        })
                      : null
                  }
                />
                <InfoField
                  label={t("studentProfile.overview.enrollmentDate")}
                  value={
                    s.enrollment_date
                      ? new Date(s.enrollment_date).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric", year: "numeric" },
                        )
                      : null
                  }
                />
                <InfoField
                  label={t("studentProfile.overview.enrollmentEndDate")}
                  value={
                    s.enrollment_end_date
                      ? new Date(s.enrollment_end_date + "T12:00:00").toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric", year: "numeric" },
                        )
                      : group.end_date
                        ? <span className="text-foreground/40">{new Date(group.end_date + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} <span className="text-xs">{t("studentProfile.overview.groupDefault")}</span></span>
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
                    className="inline-flex items-center gap-1 text-xs text-foreground/40 hover:text-foreground/70 transition-colors"
                    aria-label="Edit contacts"
                  >
                    <Pencil size={12} />
                    {t("common.edit")}
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
                  <div className="flex flex-col divide-y divide-border">
                    {contacts.slice(0, 3).map((contact) => (
                      <div key={contact.id} className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium">{contact.name}</span>
                          {contact.is_primary_guardian ? (
                            <Tooltip>
                              <Tooltip.Trigger>
                                <span className="inline-flex items-center justify-center size-5 rounded-full bg-accent/10 text-accent">
                                  <ShieldUser size={10} />
                                </span>
                              </Tooltip.Trigger>
                              <Tooltip.Content>{t("studentProfile.overview.primaryGuardian")}</Tooltip.Content>
                            </Tooltip>
                          ) : null}
                          {contact.is_emergency_contact ? (
                            <Tooltip>
                              <Tooltip.Trigger>
                                <span className="inline-flex items-center justify-center size-5 rounded-full bg-warning/10 text-warning">
                                  <Ambulance size={10} />
                                </span>
                              </Tooltip.Trigger>
                              <Tooltip.Content>{t("studentProfile.overview.emergencyContact")}</Tooltip.Content>
                            </Tooltip>
                          ) : null}
                        </div>
                        {contact.relationship && (
                          <span className="text-xs text-muted">
                            {contact.relationship}
                          </span>
                        )}
                        {contact.phone && (
                          <span className="inline-flex items-center text-xs text-foreground/60">
                            {contact.phone}
                            <CopyButton value={contact.phone} />
                          </span>
                        )}
                        {contact.email && (
                          <span className="inline-flex items-center text-xs text-foreground/60">
                            {contact.email}
                            <CopyButton value={contact.email} />
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Surface>

              {/* Addresses card */}
              <Surface
                variant="default"
                className="rounded-2xl p-5 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted uppercase tracking-wide">
                    {t("studentProfile.overview.addresses")}
                  </h3>
                  <button
                    type="button"
                    onClick={onGoToAddresses}
                    className="inline-flex items-center gap-1 text-xs text-foreground/40 hover:text-foreground/70 transition-colors"
                    aria-label="Edit addresses"
                  >
                    <Pencil size={12} />
                    {t("common.edit")}
                  </button>
                </div>
                {loadingAddresses ? (
                  <div className="flex justify-center py-4">
                    <Spinner size="sm" color="accent" />
                  </div>
                ) : addresses.length === 0 ? (
                  <p className="text-sm text-foreground/40">
                    {t("studentProfile.overview.noAddresses")}
                  </p>
                ) : (
                  <div className="flex flex-col divide-y divide-border">
                    {addresses.slice(0, 3).map((address) => (
                      <div key={address.id} className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-1.5">
                          {address.label && (
                            <span className="text-sm font-medium">{address.label}</span>
                          )}
                          {address.is_student_home ? (
                            <Tooltip>
                              <Tooltip.Trigger>
                                <span className="inline-flex items-center justify-center size-5 rounded-full bg-success/10 text-success">
                                  <Star size={10} fill="currentColor" />
                                </span>
                              </Tooltip.Trigger>
                              <Tooltip.Content>{t("addresses.studentLivesHere")}</Tooltip.Content>
                            </Tooltip>
                          ) : null}
                        </div>
                        <span className="text-xs text-foreground/60">{address.street}</span>
                        {(address.city || address.state || address.zip_code) && (
                          <span className="text-xs text-foreground/60">
                            {[address.city, address.state, address.zip_code].filter(Boolean).join(", ")}
                          </span>
                        )}
                        {address.country && (
                          <span className="text-xs text-muted">{address.country}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Surface>
            </div>

            {/* Health surface */}
            <Surface variant="default" className="rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted uppercase tracking-wide">
                  {t("studentProfile.overview.health")}
                </h3>
                <button
                  type="button"
                  onClick={onGoToServices}
                  className="inline-flex items-center gap-1 text-xs text-foreground/40 hover:text-foreground/70 transition-colors"
                  aria-label="Edit health"
                >
                  <Pencil size={12} />
                  {t("common.edit")}
                </button>
              </div>
              {loadingServices ? (
                <div className="flex justify-center py-4">
                  <Spinner size="sm" color="accent" />
                </div>
              ) : !services ? (
                <p className="text-sm text-foreground/40">{t("studentProfile.overview.noHealth")}</p>
              ) : (() => {
                const therapyLabels = [
                  services.therapy_speech        ? t("servicesPage.speechTherapy") : "",
                  services.therapy_occupational  ? t("servicesPage.occupationalTherapy") : "",
                  services.therapy_psychological ? t("servicesPage.psychologicalTherapy") : "",
                  services.therapy_physical      ? t("servicesPage.physicalTherapy") : "",
                  services.therapy_educational   ? t("servicesPage.educationalTherapy") : "",
                ].filter(Boolean);
                const hasAnything = services.has_special_education || therapyLabels.length > 0 || services.medical_plan !== "none" || services.has_treatment || services.allergies || services.conditions;
                if (!hasAnything) return <p className="text-sm text-foreground/40">{t("studentProfile.overview.noHealth")}</p>;
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    {services.has_special_education ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-muted uppercase tracking-wide">{t("studentProfile.health.specialEducation")}</span>
                        <span className="text-sm font-medium text-foreground">{t("studentProfile.health.yes")}</span>
                      </div>
                    ) : null}
                    {therapyLabels.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted uppercase tracking-wide">{t("studentProfile.health.attendsTherapy")}</span>
                        <div className="flex flex-wrap gap-1">
                          {therapyLabels.map((label) => (
                            <span key={label} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary/60 text-secondary-foreground">{label}</span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {services.medical_plan !== "none" ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-muted uppercase tracking-wide">{t("studentProfile.health.medicalInsurance")}</span>
                        <span className="text-sm font-medium text-foreground">
                          {services.medical_plan === "private" ? t("servicesPage.medicalPrivate") : t("servicesPage.medicalGovernment")}
                        </span>
                      </div>
                    ) : null}
                    {services.has_treatment ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-muted uppercase tracking-wide">{t("studentProfile.health.medicalTreatment")}</span>
                        <span className="text-sm font-medium text-foreground">{t("studentProfile.health.active")}</span>
                      </div>
                    ) : null}
                    {services.allergies ? (
                      <div className="flex flex-col gap-0.5 sm:col-span-2">
                        <span className="text-xs text-muted uppercase tracking-wide">{t("studentProfile.health.allergies")}</span>
                        <span className="text-sm font-medium text-foreground">{services.allergies}</span>
                      </div>
                    ) : null}
                    {services.conditions ? (
                      <div className="flex flex-col gap-0.5 sm:col-span-2">
                        <span className="text-xs text-muted uppercase tracking-wide">{t("servicesPage.conditionsLabel")}</span>
                        <span className="text-sm font-medium text-foreground">{services.conditions}</span>
                      </div>
                    ) : null}
                  </div>
                );
              })()}
            </Surface>

            {/* Accommodations surface */}
            <Surface variant="default" className="rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted uppercase tracking-wide">
                  {t("studentProfile.overview.accommodations")}
                </h3>
                <button
                  type="button"
                  onClick={onGoToAccommodations}
                  className="inline-flex items-center gap-1 text-xs text-foreground/40 hover:text-foreground/70 transition-colors"
                  aria-label="Edit accommodations"
                >
                  <Pencil size={12} />
                  {t("common.edit")}
                </button>
              </div>
              {loadingAccommodations ? (
                <div className="flex justify-center py-4">
                  <Spinner size="sm" color="accent" />
                </div>
              ) : !accommodations ? (
                <p className="text-sm text-foreground/40">{t("studentProfile.overview.noAccommodations")}</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {accommodations.desk_placement ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary/60 text-secondary-foreground">{t("studentProfile.accommodations.deskPlacement")}</span> : null}
                  {accommodations.extended_time ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary/60 text-secondary-foreground">{t("studentProfile.accommodations.extendedTime")}</span> : null}
                  {accommodations.shorter_assignments ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary/60 text-secondary-foreground">{t("studentProfile.accommodations.shorterAssignments")}</span> : null}
                  {accommodations.use_abacus ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary/60 text-secondary-foreground">{t("studentProfile.accommodations.abacus")}</span> : null}
                  {accommodations.simple_instructions ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary/60 text-secondary-foreground">{t("studentProfile.accommodations.simpleInstructions")}</span> : null}
                  {accommodations.visual_examples ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary/60 text-secondary-foreground">{t("studentProfile.accommodations.visualExamples")}</span> : null}
                  {!accommodations.desk_placement && !accommodations.extended_time && !accommodations.shorter_assignments && !accommodations.use_abacus && !accommodations.simple_instructions && !accommodations.visual_examples ? (
                    <p className="text-sm text-foreground/40">{t("studentProfile.overview.noAccommodations")}</p>
                  ) : null}
                </div>
              )}
            </Surface>

            {/* Observations surface */}
            <Surface variant="default" className="rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted uppercase tracking-wide">
                  {t("studentProfile.overview.observations")}
                </h3>
                <button
                  type="button"
                  onClick={onGoToObservations}
                  className="inline-flex items-center gap-1 text-xs text-foreground/40 hover:text-foreground/70 transition-colors"
                  aria-label="Edit observations"
                >
                  <Pencil size={12} />
                  {t("common.edit")}
                </button>
              </div>
              {loadingObservations ? (
                <div className="flex justify-center py-4">
                  <Spinner size="sm" color="accent" />
                </div>
              ) : !observations ? (
                <p className="text-sm text-foreground/40">{t("studentProfile.overview.noObservations")}</p>
              ) : (() => {
                const obsGroups: { label: string; items: string[] }[] = [
                  {
                    label: t("studentProfile.observations.dyslexia"),
                    items: [
                      observations.obs_reading_writing      ? t("studentProfile.observations.readingWriting") : "",
                      observations.obs_mirror_numbers       ? t("studentProfile.observations.mirrorNumbers") : "",
                      observations.obs_left_right_confusion ? t("studentProfile.observations.leftRightConfusion") : "",
                      observations.obs_sequence_difficulty  ? t("studentProfile.observations.sequenceDifficulty") : "",
                    ].filter(Boolean) as string[],
                  },
                  {
                    label: t("studentProfile.observations.addAdhd"),
                    items: [
                      observations.obs_disorganized_work   ? t("studentProfile.observations.disorganizedWork") : "",
                      observations.obs_inattention_detail  ? t("studentProfile.observations.inattentionDetail") : "",
                      observations.obs_sustained_attention ? t("studentProfile.observations.sustainedAttention") : "",
                      observations.obs_doesnt_listen       ? t("studentProfile.observations.doesntListen") : "",
                      observations.obs_task_organization   ? t("studentProfile.observations.taskOrganization") : "",
                      observations.obs_loses_belongings    ? t("studentProfile.observations.losesbelongings") : "",
                      observations.obs_distracted_stimuli  ? t("studentProfile.observations.distractedStimuli") : "",
                      observations.obs_forgetful           ? t("studentProfile.observations.forgetful") : "",
                      observations.obs_excess_hand_foot    ? t("studentProfile.observations.excessHandFoot") : "",
                      observations.obs_gets_up_from_seat   ? t("studentProfile.observations.getsUpFromSeat") : "",
                      observations.obs_running_jumping     ? t("studentProfile.observations.runningJumping") : "",
                      observations.obs_talks_excessively   ? t("studentProfile.observations.talksExcessively") : "",
                      observations.obs_difficulty_quiet    ? t("studentProfile.observations.difficultyQuiet") : "",
                      observations.obs_driven_by_motor     ? t("studentProfile.observations.drivenByMotor") : "",
                      observations.obs_impulsive_answers   ? t("studentProfile.observations.impulsiveAnswers") : "",
                      observations.obs_difficulty_waiting  ? t("studentProfile.observations.difficultyWaiting") : "",
                      observations.obs_interrupts_others   ? t("studentProfile.observations.interruptsOthers") : "",
                    ].filter(Boolean) as string[],
                  },
                  {
                    label: t("studentProfile.observations.oppositionalSocial"),
                    items: [
                      observations.obs_easily_angered  ? t("studentProfile.observations.easilyAngered") : "",
                      observations.obs_argues          ? t("studentProfile.observations.argues") : "",
                      observations.obs_defies_adults   ? t("studentProfile.observations.defiesAdults") : "",
                      observations.obs_annoys_others   ? t("studentProfile.observations.annoysOthers") : "",
                      observations.obs_aggressive      ? t("studentProfile.observations.aggressive") : "",
                      observations.obs_spiteful        ? t("studentProfile.observations.spiteful") : "",
                      observations.obs_blames_others   ? t("studentProfile.observations.blamesOthers") : "",
                      observations.obs_breaks_property ? t("studentProfile.observations.breaksProperty") : "",
                    ].filter(Boolean) as string[],
                  },
                  {
                    label: t("studentProfile.observations.other"),
                    items: [
                      observations.obs_incomplete_homework  ? t("studentProfile.observations.incompleteHomework") : "",
                      observations.obs_frequent_absences    ? t("studentProfile.observations.frequentAbsences") : "",
                      observations.obs_neglected_appearance ? t("studentProfile.observations.neglectedAppearance") : "",
                      observations.obs_uses_profanity       ? t("studentProfile.observations.usesProfanity") : "",
                      observations.obs_takes_belongings     ? t("studentProfile.observations.takesBelongings") : "",
                      observations.obs_forgets_materials    ? t("studentProfile.observations.forgetsMaterials") : "",
                      observations.obs_appears_sad          ? t("studentProfile.observations.appearsSad") : "",
                    ].filter(Boolean) as string[],
                  },
                ].filter((g) => g.items.length > 0);

                if (obsGroups.length === 0) return <p className="text-sm text-foreground/40">{t("studentProfile.overview.noObservations")}</p>;
                return (
                  <div className="flex flex-col gap-3">
                    {obsGroups.map((obsGroup) => (
                      <div key={obsGroup.label} className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold text-muted uppercase tracking-wide">{obsGroup.label}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {obsGroup.items.map((item) => (
                            <span key={item} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary/60 text-secondary-foreground">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </Surface>
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
          ) : (
            <>
              {assignments.length > 0 && (
                <div className="flex items-center gap-3 mb-4">
                  <Input
                    placeholder={t("studentProfile.assignments.searchPlaceholder")}
                    value={assignmentSearch}
                    onChange={(e) => setAssignmentSearch(e.target.value)}
                    className="max-w-xs"
                  />
                  <Select
                    aria-label={t("studentProfile.assignments.allPeriods")}
                    selectedKey={assignmentPeriodFilter}
                    onSelectionChange={(key) => setAssignmentPeriodFilter(String(key))}
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
              )}
              <TableRoot variant="primary" className="flex-1 min-h-0">
                <TableScrollContainer className="h-full">
                  <TableContent aria-label={t("studentProfile.tabs.assignments")}>
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
                    <TableBody
                      renderEmptyState={() => (
                        <EmptyState className="flex h-full w-full flex-col items-center justify-center gap-2 py-12 text-center">
                          <Inbox className="size-6 text-muted" />
                          <span className="text-sm font-medium text-muted">
                            {assignments.length === 0
                              ? t("studentProfile.assignments.noAssignments")
                              : t("studentProfile.assignments.noResults")}
                          </span>
                          {assignments.length > 0 && (
                            <span className="text-xs text-foreground/40">
                              {t("studentProfile.assignments.noResultsHint")}
                            </span>
                          )}
                        </EmptyState>
                      )}
                    >
                      {filteredAssignments.map((a) => (
                        <TableRow key={a.assignment_id} id={a.assignment_id}>
                          <TableCell className="font-medium">{a.title}</TableCell>
                          <TableCell className="text-sm text-foreground/50">
                            {a.period_name}
                          </TableCell>
                          <TableCell className="text-sm">
                            {a.score !== null ? (
                              <span className={a.score > a.max_score ? "text-warning" : "text-foreground"}>
                                {a.score}
                              </span>
                            ) : (
                              <span className="text-foreground/30">—</span>
                            )}
                            <span className="text-xs text-muted ml-0.5">/ {a.max_score}</span>
                          </TableCell>
                          <TableCell className="text-sm text-foreground/50 whitespace-nowrap">
                            {new Date(a.created_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </TableContent>
                </TableScrollContainer>
              </TableRoot>
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
          ) : (
            <>
              {attendanceDays.length > 0 && <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {(
                  [
                    { key: "totalDays", value: attendanceSummary.totalDays, color: "text-foreground" },
                    { key: "present",   value: attendanceSummary.present,   color: "text-success" },
                    { key: "absent",    value: attendanceSummary.absent,    color: "text-danger" },
                    { key: "late",      value: attendanceSummary.late,      color: "text-warning" },
                    { key: "partial",   value: attendanceSummary.partial,   color: "text-secondary-foreground" },
                  ] as { key: "totalDays" | "present" | "absent" | "late" | "partial"; value: number; color: string }[]
                ).map(({ key, value, color }) => {
                  const isActive = attendanceFilter === key;
                  return (
                    <Surface
                      key={key}
                      variant="default"
                      className={`rounded-xl p-3 flex flex-col gap-0.5 text-center cursor-pointer select-none transition-all ${
                        isActive ? "ring-2 ring-foreground/30" : "hover:ring-1 hover:ring-foreground/10"
                      }`}
                      onClick={() => setAttendanceFilter(isActive ? null : key)}
                    >
                      <span className={`text-xl font-bold ${color}`}>{value}</span>
                      <span className="text-xs text-muted">
                        {t(`studentProfile.attendance.summary.${key}`)}
                      </span>
                    </Surface>
                  );
                })}
              </div>}
              <TableRoot variant="primary" className="flex-1 min-h-0">
                <TableScrollContainer className="h-full">
                  <TableContent aria-label={t("studentProfile.tabs.attendance")}>
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
                    <TableBody
                      renderEmptyState={() => (
                        <EmptyState className="flex h-full w-full flex-col items-center justify-center gap-2 py-12 text-center">
                          <Inbox className="size-6 text-muted" />
                          <span className="text-sm font-medium text-muted">
                            {t("studentProfile.attendance.noAttendance")}
                          </span>
                          <span className="text-xs text-foreground/40">
                            {t("studentProfile.attendance.noAttendanceHint")}
                          </span>
                        </EmptyState>
                      )}
                    >
                      {filteredAttendanceDays.map((day) => {
                        const statusColors: Record<DayAttendanceStatus, string> = {
                          present: "text-success",
                          absent: "text-danger",
                          late: "text-warning",
                          partial: "text-secondary-foreground",
                        };
                        return (
                          <TableRow key={day.date} id={day.date}>
                            <TableCell className="font-medium whitespace-nowrap">
                              {new Date(day.date + "T12:00:00").toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </TableCell>
                            <TableCell>
                              <span className={`text-sm font-medium ${statusColors[day.dayStatus]}`}>
                                {t(`studentProfile.attendance.status.${day.dayStatus}`)}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-foreground/50">
                              {"—"}
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
                  <TableBody
                    renderEmptyState={() => (
                      <EmptyState className="flex h-full w-full flex-col items-center justify-center gap-2 py-12 text-center">
                        <Inbox className="size-6 text-muted" />
                        <span className="text-sm font-medium text-muted">
                          {visitations.length === 0
                            ? t("studentProfile.visitations.noVisitations")
                            : t("studentProfile.visitations.noResults")}
                        </span>
                        <span className="text-xs text-foreground/40">
                          {visitations.length === 0
                            ? t("studentProfile.visitations.noVisitationsHint")
                            : t("studentProfile.visitations.noResultsHint", { search: visitationSearch })}
                        </span>
                      </EmptyState>
                    )}
                  >
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
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder={t("studentProfile.notes.searchPlaceholder")}
                value={noteSearch}
                onChange={(e) => setNoteSearch(e.target.value)}
                className="max-w-xs"
              />
              <Select
                aria-label={t("studentProfile.notes.tags.label")}
                selectedKey={noteTagFilter}
                onSelectionChange={(key) => setNoteTagFilter(key as "all" | NoteTagKey)}
                className="w-36"
              >
                <Select.Trigger>
                  <Select.Value>
                    {({ selectedText, isPlaceholder }) =>
                      isPlaceholder ? t("studentProfile.notes.tags.all") : selectedText
                    }
                  </Select.Value>
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="all" textValue={t("studentProfile.notes.tags.all")}>
                      {t("studentProfile.notes.tags.all")}
                    </ListBox.Item>
                    {NOTE_TAG_KEYS.map((tag) => (
                      <ListBox.Item key={tag} id={tag} textValue={t(`studentProfile.notes.tags.${tag}`)}>
                        {t(`studentProfile.notes.tags.${tag}`)}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>
            <Button variant="primary" size="sm" onPress={noteModalState.open}>
              {t("studentProfile.notes.addNote")}
            </Button>
          </div>

          {loadingNotes ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" color="accent" />
            </div>
          ) : (
            <TableRoot variant="primary" className="flex-1 min-h-0">
              <TableScrollContainer className="h-full">
                <TableContent
                  aria-label={t("studentProfile.tabs.notes")}
                  onRowAction={(key) => {
                    const note = notes.find((n) => n.id === key);
                    if (note) openViewNoteModal(note);
                  }}
                >
                  <TableHeader>
                    <TableColumn isRowHeader>
                      {t("studentProfile.notes.columns.note")}
                    </TableColumn>
                    <TableColumn>
                      {t("studentProfile.notes.columns.date")}
                    </TableColumn>
                  </TableHeader>
                  <TableBody
                    renderEmptyState={() => (
                      <EmptyState className="flex h-full w-full flex-col items-center justify-center gap-2 py-12 text-center">
                        <Inbox className="size-6 text-muted" />
                        <span className="text-sm font-medium text-muted">
                          {notes.length === 0
                            ? t("studentProfile.notes.noNotes")
                            : t("studentProfile.notes.noResults")}
                        </span>
                        <span className="text-xs text-foreground/40">
                          {notes.length === 0
                            ? t("studentProfile.notes.noNotesHint")
                            : t("studentProfile.notes.noResultsHint", { search: noteSearch })}
                        </span>
                      </EmptyState>
                    )}
                  >
                    {filteredNotes.map((note) => {
                      const tags = parseTags(note.tags);
                      return (
                        <TableRow key={note.id} id={note.id} className="cursor-pointer">
                          <TableCell className="text-sm text-foreground whitespace-pre-wrap max-w-md">
                            {tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-1.5">
                                {tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${NOTE_TAG_COLORS[tag].chip}`}
                                  >
                                    {t(`studentProfile.notes.tags.${tag}`)}
                                  </span>
                                ))}
                              </div>
                            )}
                            {note.content}
                          </TableCell>
                          <TableCell className="text-sm text-foreground/50 whitespace-nowrap">
                            {formatNoteTimestamp(note.created_at)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </TableContent>
              </TableScrollContainer>
            </TableRoot>
          )}
        </Tabs.Panel>
      </Tabs>

      <Modal state={viewNoteModalState}>
        <Modal.Backdrop isDismissable={!editNoteSubmitting}>
          <Modal.Container>
            <Modal.Dialog>
              {isEditingNote ? (
                <form onSubmit={handleEditNoteSubmit}>
                  <Modal.Header>{t("notes.viewModal.editTitle")}</Modal.Header>
                  <Modal.Body className="flex flex-col gap-4 pb-px overflow-y-auto">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="edit-note-content">{t("studentProfile.addNoteModal.noteLabel")}</Label>
                      <textarea
                        id="edit-note-content"
                        value={editNoteContent}
                        onChange={(e) => setEditNoteContent(e.target.value)}
                        rows={5}
                        required
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium">{t("studentProfile.addNoteModal.tagsLabel")}</span>
                      <div className="flex flex-wrap gap-2">
                        {NOTE_TAG_KEYS.map((tag) => {
                          const isActive = editNoteTags.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() =>
                                setEditNoteTags((prev) =>
                                  isActive ? prev.filter((k) => k !== tag) : [...prev, tag]
                                )
                              }
                              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                isActive ? NOTE_TAG_COLORS[tag].active : NOTE_TAG_COLORS[tag].inactive
                              }`}
                            >
                              {t(`studentProfile.notes.tags.${tag}`)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {editNoteError && <p className="text-danger text-sm">{editNoteError}</p>}
                  </Modal.Body>
                  <Modal.Footer>
                    <Button type="button" variant="ghost" onPress={() => setIsEditingNote(false)} isDisabled={editNoteSubmitting}>
                      {t("common.cancel")}
                    </Button>
                    <Button type="submit" variant="primary" isDisabled={editNoteSubmitting || !editNoteContent.trim()}>
                      {editNoteSubmitting ? <Spinner size="sm" /> : t("common.save")}
                    </Button>
                  </Modal.Footer>
                </form>
              ) : (
                <>
                  <Modal.Header>{t("notes.viewModal.title")}</Modal.Header>
                  <Modal.Body className="flex flex-col gap-4 pb-px overflow-visible">
                    {viewingNote && parseTags(viewingNote.tags).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {parseTags(viewingNote.tags).map((tag) => (
                          <span
                            key={tag}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${NOTE_TAG_COLORS[tag].chip}`}
                          >
                            {t(`studentProfile.notes.tags.${tag}`)}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-foreground whitespace-pre-wrap">{viewingNote?.content}</p>
                    <p className="text-xs text-muted">{viewingNote ? formatNoteTimestamp(viewingNote.created_at) : ""}</p>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button type="button" variant="ghost" onPress={closeViewNoteModal}>
                      {t("common.cancel")}
                    </Button>
                    <Button type="button" variant="secondary" onPress={startEditingNote}>
                      <Pencil size={14} />
                      {t("notes.viewModal.edit")}
                    </Button>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal state={noteModalState}>
        <Modal.Backdrop isDismissable={!noteSubmitting}>
          <Modal.Container>
            <Modal.Dialog>
              <form onSubmit={handleAddNote}>
                <Modal.Header>
                  {t("studentProfile.addNoteModal.title")}
                </Modal.Header>
                <Modal.Body className="flex flex-col gap-4 pb-px overflow-y-auto">
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
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium">
                      {t("studentProfile.addNoteModal.tagsLabel")}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {NOTE_TAG_KEYS.map((tag) => {
                        const isActive = noteTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() =>
                              setNoteTags((prev) =>
                                isActive ? prev.filter((k) => k !== tag) : [...prev, tag]
                              )
                            }
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                              isActive ? NOTE_TAG_COLORS[tag].active : NOTE_TAG_COLORS[tag].inactive
                            }`}
                          >
                            {t(`studentProfile.notes.tags.${tag}`)}
                          </button>
                        );
                      })}
                    </div>
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
