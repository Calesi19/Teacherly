import { useState, useCallback } from "react";
import { Ambulance, Inbox, Pencil, ShieldUser, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AppDatePicker } from "@/components/ui/app-date-picker";
import { cn } from "@/lib/utils";
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
import {
  NOTE_TAG_KEYS,
  NOTE_TAG_COLORS,
  type NoteTagKey,
  type Note,
  parseTags,
  serializeTags,
} from "../types/note";
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
      className="ml-1.5 inline-flex items-center text-foreground/30 transition-colors hover:text-foreground/70"
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
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      <span className="text-sm font-medium text-foreground">
        {value ?? <span className="text-foreground/30">—</span>}
      </span>
    </div>
  );
}

function SectionCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border bg-background p-5", className)}>
      {children}
    </div>
  );
}

function SectionHeader({
  title,
  onEdit,
  ariaLabel,
  editLabel,
}: {
  title: string;
  onEdit: () => void;
  ariaLabel: string;
  editLabel: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
        {title}
      </h3>
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex items-center gap-1 text-xs text-foreground/40 transition-colors hover:text-foreground/70"
        aria-label={ariaLabel}
      >
        <Pencil size={12} />
        {editLabel}
      </button>
    </div>
  );
}

function LoadingSpinner({ large = false }: { large?: boolean }) {
  return (
    <div className="flex justify-center py-4">
      <div
        className={cn(
          "animate-spin rounded-full border-2 border-accent border-t-transparent",
          large ? "h-8 w-8 py-12" : "h-5 w-5",
        )}
      />
    </div>
  );
}

function TableEmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <Inbox className="size-6 text-muted" />
      <span className="text-sm font-medium text-muted">{title}</span>
      {hint && <span className="text-xs text-foreground/40">{hint}</span>}
    </div>
  );
}

function getAge(birthdate: string): number {
  const birth = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateFromLocal(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

function todayDateString(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function IconTooltip({
  label,
  className,
  children,
}: {
  label: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className={cn(
              "inline-flex size-5 items-center justify-center rounded-full",
              className,
            )}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
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

  const [activeTab, setActiveTab] = useState("overview");
  const [noteOpen, setNoteOpen] = useState(false);
  const [viewNoteOpen, setViewNoteOpen] = useState(false);
  const [visitationOpen, setVisitationOpen] = useState(false);

  const [noteContent, setNoteContent] = useState("");
  const [noteTags, setNoteTags] = useState<NoteTagKey[]>([]);
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editNoteContent, setEditNoteContent] = useState("");
  const [editNoteTags, setEditNoteTags] = useState<NoteTagKey[]>([]);
  const [editNoteSubmitting, setEditNoteSubmitting] = useState(false);
  const [editNoteError, setEditNoteError] = useState<string | null>(null);

  const [selectedVisitorKey, setSelectedVisitorKey] = useState<string | null>(null);
  const [newVisitorName, setNewVisitorName] = useState("");
  const [visitNotes, setVisitNotes] = useState("");
  const [visitedAt, setVisitedAt] = useState(todayDateString());
  const [visitSubmitting, setVisitSubmitting] = useState(false);
  const [visitError, setVisitError] = useState<string | null>(null);

  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [assignmentPeriodFilter, setAssignmentPeriodFilter] = useState("all");
  const [noteSearch, setNoteSearch] = useState("");
  const [noteTagFilter, setNoteTagFilter] = useState<"all" | NoteTagKey>("all");
  const [visitationSearch, setVisitationSearch] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState<
    "totalDays" | "present" | "absent" | "late" | "partial" | null
  >(null);

  const { student: freshStudent } = useStudentInfo(student.id);
  const s = freshStudent ?? student;
  const { contacts, loading: loadingContacts } = useContacts(student.id);
  const { addresses, loading: loadingAddresses } = useAddresses(student.id);
  const { data: services, loading: loadingServices } = useStudentServices(student.id);
  const { data: accommodations, loading: loadingAccommodations } =
    useStudentAccommodations(student.id);
  const { data: observations, loading: loadingObservations } =
    useStudentObservations(student.id);
  const { notes, loading: loadingNotes, addNote, updateNote } = useNotes(student.id);
  const { visitations, loading: loadingVisitations, addVisitation } =
    useVisitations(student.id);
  const { previews: assignments, loading: loadingAssignments } =
    useStudentAssignmentPreviews(student.id, group.id);
  const {
    days: attendanceDays,
    summary: attendanceSummary,
    loading: loadingAttendance,
  } = useStudentAttendance(student.id);

  const filteredAttendanceDays = attendanceDays.filter((day) => {
    if (!attendanceFilter || attendanceFilter === "totalDays") return true;
    if (attendanceFilter === "present") {
      return day.dayStatus === "present" || day.dayStatus === "late";
    }
    return day.dayStatus === attendanceFilter;
  });

  const assignmentPeriods = Array.from(new Set(assignments.map((a) => a.period_name))).sort();
  const filteredAssignments = assignments.filter((assignment) => {
    const matchesSearch = assignment.title
      .toLowerCase()
      .includes(assignmentSearch.toLowerCase());
    const matchesPeriod =
      assignmentPeriodFilter === "all" ||
      assignment.period_name === assignmentPeriodFilter;
    return matchesSearch && matchesPeriod;
  });

  const filteredNotes = notes.filter((note) => {
    const query = noteSearch.toLowerCase();
    const matchesSearch =
      note.content.toLowerCase().includes(query) || note.tags.toLowerCase().includes(query);
    const matchesTag = noteTagFilter === "all" || parseTags(note.tags).includes(noteTagFilter);
    return matchesSearch && matchesTag;
  });

  const filteredVisitations = visitations.filter((visitation) =>
    visitation.contact_name.toLowerCase().includes(visitationSearch.toLowerCase()),
  );

  const isNewVisitor = selectedVisitorKey === "new";
  const matchedContact =
    selectedVisitorKey && selectedVisitorKey !== "new"
      ? contacts.find((contact) => String(contact.id) === selectedVisitorKey) ?? null
      : null;

  const canSubmitVisitation =
    !visitSubmitting &&
    !!visitedAt &&
    (isNewVisitor ? newVisitorName.trim().length > 0 : matchedContact !== null);

  const closeVisitationDialog = () => {
    setSelectedVisitorKey(null);
    setNewVisitorName("");
    setVisitNotes("");
    setVisitedAt(todayDateString());
    setVisitError(null);
    setVisitationOpen(false);
  };

  const handleAddVisitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitVisitation) return;

    setVisitSubmitting(true);
    setVisitError(null);
    try {
      await addVisitation({
        contact_id: matchedContact ? matchedContact.id : null,
        visitor_name: isNewVisitor ? newVisitorName.trim() : matchedContact?.name ?? "",
        notes: visitNotes,
        visited_at: visitedAt,
      });
      closeVisitationDialog();
    } catch (err) {
      setVisitError(String(err));
    } finally {
      setVisitSubmitting(false);
    }
  };

  const closeNoteDialog = () => {
    setNoteContent("");
    setNoteTags([]);
    setNoteError(null);
    setNoteOpen(false);
  };

  const openViewNoteDialog = (note: Note) => {
    setViewingNote(note);
    setIsEditingNote(false);
    setEditNoteError(null);
    setViewNoteOpen(true);
  };

  const closeViewNoteDialog = () => {
    setIsEditingNote(false);
    setEditNoteError(null);
    setViewNoteOpen(false);
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
      const serializedTags = serializeTags(editNoteTags);
      await updateNote(viewingNote.id, {
        content: editNoteContent.trim(),
        tags: serializedTags,
      });
      setViewingNote((prev) =>
        prev
          ? {
              ...prev,
              content: editNoteContent.trim(),
              tags: serializedTags,
            }
          : prev,
      );
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
      closeNoteDialog();
    } catch (err) {
      setNoteError(String(err));
    } finally {
      setNoteSubmitting(false);
    }
  };

  const observationGroups = observations
    ? [
        {
          label: t("studentProfile.observations.dyslexia"),
          items: [
            observations.obs_reading_writing ? t("studentProfile.observations.readingWriting") : "",
            observations.obs_mirror_numbers ? t("studentProfile.observations.mirrorNumbers") : "",
            observations.obs_left_right_confusion ? t("studentProfile.observations.leftRightConfusion") : "",
            observations.obs_sequence_difficulty ? t("studentProfile.observations.sequenceDifficulty") : "",
          ].filter(Boolean),
        },
        {
          label: t("studentProfile.observations.addAdhd"),
          items: [
            observations.obs_disorganized_work ? t("studentProfile.observations.disorganizedWork") : "",
            observations.obs_inattention_detail ? t("studentProfile.observations.inattentionDetail") : "",
            observations.obs_sustained_attention ? t("studentProfile.observations.sustainedAttention") : "",
            observations.obs_doesnt_listen ? t("studentProfile.observations.doesntListen") : "",
            observations.obs_task_organization ? t("studentProfile.observations.taskOrganization") : "",
            observations.obs_loses_belongings ? t("studentProfile.observations.losesbelongings") : "",
            observations.obs_distracted_stimuli ? t("studentProfile.observations.distractedStimuli") : "",
            observations.obs_forgetful ? t("studentProfile.observations.forgetful") : "",
            observations.obs_excess_hand_foot ? t("studentProfile.observations.excessHandFoot") : "",
            observations.obs_gets_up_from_seat ? t("studentProfile.observations.getsUpFromSeat") : "",
            observations.obs_running_jumping ? t("studentProfile.observations.runningJumping") : "",
            observations.obs_talks_excessively ? t("studentProfile.observations.talksExcessively") : "",
            observations.obs_difficulty_quiet ? t("studentProfile.observations.difficultyQuiet") : "",
            observations.obs_driven_by_motor ? t("studentProfile.observations.drivenByMotor") : "",
            observations.obs_impulsive_answers ? t("studentProfile.observations.impulsiveAnswers") : "",
            observations.obs_difficulty_waiting ? t("studentProfile.observations.difficultyWaiting") : "",
            observations.obs_interrupts_others ? t("studentProfile.observations.interruptsOthers") : "",
          ].filter(Boolean),
        },
        {
          label: t("studentProfile.observations.oppositionalSocial"),
          items: [
            observations.obs_easily_angered ? t("studentProfile.observations.easilyAngered") : "",
            observations.obs_argues ? t("studentProfile.observations.argues") : "",
            observations.obs_defies_adults ? t("studentProfile.observations.defiesAdults") : "",
            observations.obs_annoys_others ? t("studentProfile.observations.annoysOthers") : "",
            observations.obs_aggressive ? t("studentProfile.observations.aggressive") : "",
            observations.obs_spiteful ? t("studentProfile.observations.spiteful") : "",
            observations.obs_blames_others ? t("studentProfile.observations.blamesOthers") : "",
            observations.obs_breaks_property ? t("studentProfile.observations.breaksProperty") : "",
          ].filter(Boolean),
        },
        {
          label: t("studentProfile.observations.other"),
          items: [
            observations.obs_incomplete_homework ? t("studentProfile.observations.incompleteHomework") : "",
            observations.obs_frequent_absences ? t("studentProfile.observations.frequentAbsences") : "",
            observations.obs_neglected_appearance ? t("studentProfile.observations.neglectedAppearance") : "",
            observations.obs_uses_profanity ? t("studentProfile.observations.usesProfanity") : "",
            observations.obs_takes_belongings ? t("studentProfile.observations.takesBelongings") : "",
            observations.obs_forgets_materials ? t("studentProfile.observations.forgetsMaterials") : "",
            observations.obs_appears_sad ? t("studentProfile.observations.appearsSad") : "",
          ].filter(Boolean),
        },
      ].filter((groupItem) => groupItem.items.length > 0)
    : [];

  const statusColors: Record<DayAttendanceStatus, string> = {
    present: "text-success",
    absent: "text-danger",
    late: "text-warning",
    partial: "text-secondary-foreground",
  };

  const therapyLabels = services
    ? [
        services.therapy_speech ? t("servicesPage.speechTherapy") : "",
        services.therapy_occupational ? t("servicesPage.occupationalTherapy") : "",
        services.therapy_psychological ? t("servicesPage.psychologicalTherapy") : "",
        services.therapy_physical ? t("servicesPage.physicalTherapy") : "",
        services.therapy_educational ? t("servicesPage.educationalTherapy") : "",
      ].filter(Boolean)
    : [];

  const hasHealthContent =
    !!services &&
    (services.has_special_education ||
      therapyLabels.length > 0 ||
      services.medical_plan !== "none" ||
      services.has_treatment ||
      !!services.allergies ||
      !!services.conditions);

  const hasAccommodationContent =
    !!accommodations &&
    (
      accommodations.desk_placement ||
      accommodations.extended_time ||
      accommodations.shorter_assignments ||
      accommodations.use_abacus ||
      accommodations.simple_instructions ||
      accommodations.visual_examples
    );

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col px-6 py-6 pl-3">
        <Breadcrumb
          items={[
            { label: t("groups.breadcrumb"), onClick: onGoToGroups },
            { label: group.name, onClick: onGoToStudents },
            { label: t("attendance.studentsHeader"), onClick: onGoToStudents },
            { label: student.name },
          ]}
        />

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value ?? "overview")}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="mb-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div>
                <h2 className="text-2xl font-bold">{student.name}</h2>
              </div>
            </div>

            <TabsList variant="line" aria-label="Student sections" className="flex-wrap">
              <TabsTrigger value="overview">{t("studentProfile.tabs.overview")}</TabsTrigger>
              <TabsTrigger value="assignments">{t("studentProfile.tabs.assignments")}</TabsTrigger>
              <TabsTrigger value="attendance">{t("studentProfile.tabs.attendance")}</TabsTrigger>
              <TabsTrigger value="visitations">{t("studentProfile.tabs.visitations")}</TabsTrigger>
              <TabsTrigger value="notes">{t("studentProfile.tabs.notes")}</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="flex-1 overflow-y-auto pt-4">
            <div className="flex flex-col gap-4">
              <SectionCard>
                <SectionHeader
                  title={t("studentProfile.overview.studentInfo")}
                  onEdit={onGoToStudentInfo}
                  ariaLabel="Edit student info"
                  editLabel={t("common.edit")}
                />
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
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
                  <InfoField label={t("studentProfile.overview.gender")} value={s.gender} />
                  <InfoField
                    label={t("studentProfile.overview.birthdate")}
                    value={s.birthdate ? formatShortDate(s.birthdate) : null}
                  />
                  <InfoField
                    label={t("studentProfile.overview.age")}
                    value={
                      s.birthdate
                        ? t("studentProfile.overview.ageYears", { age: getAge(s.birthdate) })
                        : null
                    }
                  />
                  <InfoField
                    label={t("studentProfile.overview.enrollmentDate")}
                    value={s.enrollment_date ? formatShortDate(s.enrollment_date) : null}
                  />
                  <InfoField
                    label={t("studentProfile.overview.enrollmentEndDate")}
                    value={
                      s.enrollment_end_date ? (
                        formatDateFromLocal(s.enrollment_end_date)
                      ) : group.end_date ? (
                        <span className="text-foreground/40">
                          {formatDateFromLocal(group.end_date)}{" "}
                          <span className="text-xs">{t("studentProfile.overview.groupDefault")}</span>
                        </span>
                      ) : null
                    }
                  />
                </div>
              </SectionCard>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SectionCard className="flex flex-col gap-3">
                  <SectionHeader
                    title={t("studentProfile.overview.contacts")}
                    onEdit={onGoToContacts}
                    ariaLabel="Edit contacts"
                    editLabel={t("common.edit")}
                  />
                  {loadingContacts ? (
                    <LoadingSpinner />
                  ) : contacts.length === 0 ? (
                    <p className="text-sm text-foreground/40">{t("studentProfile.overview.noContacts")}</p>
                  ) : (
                    <div className="flex flex-col divide-y divide-border">
                      {contacts.slice(0, 3).map((contact) => (
                        <div key={contact.id} className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium">{contact.name}</span>
                            {contact.is_primary_guardian && (
                              <IconTooltip
                                label={t("studentProfile.overview.primaryGuardian")}
                                className="bg-accent/10 text-accent"
                              >
                                <ShieldUser size={10} />
                              </IconTooltip>
                            )}
                            {contact.is_emergency_contact && (
                              <IconTooltip
                                label={t("studentProfile.overview.emergencyContact")}
                                className="bg-warning/10 text-warning"
                              >
                                <Ambulance size={10} />
                              </IconTooltip>
                            )}
                          </div>
                          {contact.relationship && (
                            <span className="text-xs text-muted">{contact.relationship}</span>
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
                </SectionCard>

                <SectionCard className="flex flex-col gap-3">
                  <SectionHeader
                    title={t("studentProfile.overview.addresses")}
                    onEdit={onGoToAddresses}
                    ariaLabel="Edit addresses"
                    editLabel={t("common.edit")}
                  />
                  {loadingAddresses ? (
                    <LoadingSpinner />
                  ) : addresses.length === 0 ? (
                    <p className="text-sm text-foreground/40">{t("studentProfile.overview.noAddresses")}</p>
                  ) : (
                    <div className="flex flex-col divide-y divide-border">
                      {addresses.slice(0, 3).map((address) => (
                        <div key={address.id} className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0">
                          <div className="flex items-center gap-1.5">
                            {address.label && <span className="text-sm font-medium">{address.label}</span>}
                            {address.is_student_home && (
                              <IconTooltip
                                label={t("addresses.studentLivesHere")}
                                className="bg-success/10 text-success"
                              >
                                <Star size={10} fill="currentColor" />
                              </IconTooltip>
                            )}
                          </div>
                          <span className="text-xs text-foreground/60">{address.street}</span>
                          {(address.city || address.state || address.zip_code) && (
                            <span className="text-xs text-foreground/60">
                              {[address.city, address.state, address.zip_code].filter(Boolean).join(", ")}
                            </span>
                          )}
                          {address.country && <span className="text-xs text-muted">{address.country}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>

              <SectionCard className="flex flex-col gap-3">
                <SectionHeader
                  title={t("studentProfile.overview.health")}
                  onEdit={onGoToServices}
                  ariaLabel="Edit health"
                  editLabel={t("common.edit")}
                />
                {loadingServices ? (
                  <LoadingSpinner />
                ) : !hasHealthContent ? (
                  <p className="text-sm text-foreground/40">{t("studentProfile.overview.noHealth")}</p>
                ) : (
                  <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                    {services?.has_special_education && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs uppercase tracking-wide text-muted">
                          {t("studentProfile.health.specialEducation")}
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {t("studentProfile.health.yes")}
                        </span>
                      </div>
                    )}
                    {therapyLabels.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-wide text-muted">
                          {t("studentProfile.health.attendsTherapy")}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {therapyLabels.map((label) => (
                            <Badge key={label} variant="secondary">{label}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {services && services.medical_plan !== "none" && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs uppercase tracking-wide text-muted">
                          {t("studentProfile.health.medicalInsurance")}
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {services.medical_plan === "private"
                            ? t("servicesPage.medicalPrivate")
                            : t("servicesPage.medicalGovernment")}
                        </span>
                      </div>
                    )}
                    {services?.has_treatment && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs uppercase tracking-wide text-muted">
                          {t("studentProfile.health.medicalTreatment")}
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {t("studentProfile.health.active")}
                        </span>
                      </div>
                    )}
                    {services?.allergies && (
                      <div className="flex flex-col gap-0.5 sm:col-span-2">
                        <span className="text-xs uppercase tracking-wide text-muted">
                          {t("studentProfile.health.allergies")}
                        </span>
                        <span className="text-sm font-medium text-foreground">{services.allergies}</span>
                      </div>
                    )}
                    {services?.conditions && (
                      <div className="flex flex-col gap-0.5 sm:col-span-2">
                        <span className="text-xs uppercase tracking-wide text-muted">
                          {t("servicesPage.conditionsLabel")}
                        </span>
                        <span className="text-sm font-medium text-foreground">{services.conditions}</span>
                      </div>
                    )}
                  </div>
                )}
              </SectionCard>

              <SectionCard className="flex flex-col gap-3">
                <SectionHeader
                  title={t("studentProfile.overview.accommodations")}
                  onEdit={onGoToAccommodations}
                  ariaLabel="Edit accommodations"
                  editLabel={t("common.edit")}
                />
                {loadingAccommodations ? (
                  <LoadingSpinner />
                ) : !hasAccommodationContent ? (
                  <p className="text-sm text-foreground/40">{t("studentProfile.overview.noAccommodations")}</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {accommodations?.desk_placement && (
                      <Badge variant="secondary">{t("studentProfile.accommodations.deskPlacement")}</Badge>
                    )}
                    {accommodations?.extended_time && (
                      <Badge variant="secondary">{t("studentProfile.accommodations.extendedTime")}</Badge>
                    )}
                    {accommodations?.shorter_assignments && (
                      <Badge variant="secondary">{t("studentProfile.accommodations.shorterAssignments")}</Badge>
                    )}
                    {accommodations?.use_abacus && (
                      <Badge variant="secondary">{t("studentProfile.accommodations.abacus")}</Badge>
                    )}
                    {accommodations?.simple_instructions && (
                      <Badge variant="secondary">{t("studentProfile.accommodations.simpleInstructions")}</Badge>
                    )}
                    {accommodations?.visual_examples && (
                      <Badge variant="secondary">{t("studentProfile.accommodations.visualExamples")}</Badge>
                    )}
                  </div>
                )}
              </SectionCard>

              <SectionCard className="flex flex-col gap-3">
                <SectionHeader
                  title={t("studentProfile.overview.observations")}
                  onEdit={onGoToObservations}
                  ariaLabel="Edit observations"
                  editLabel={t("common.edit")}
                />
                {loadingObservations ? (
                  <LoadingSpinner />
                ) : observationGroups.length === 0 ? (
                  <p className="text-sm text-foreground/40">{t("studentProfile.overview.noObservations")}</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {observationGroups.map((groupItem) => (
                      <div key={groupItem.label} className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                          {groupItem.label}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {groupItem.items.map((item) => (
                            <Badge key={item} variant="secondary">{item}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
          </TabsContent>

          <TabsContent value="assignments" className="flex min-h-0 flex-1 flex-col pt-4">
            {loadingAssignments ? (
              <LoadingSpinner large />
            ) : (
              <>
                {assignments.length > 0 && (
                  <div className="mb-4 flex items-center gap-3">
                    <Input
                      placeholder={t("studentProfile.assignments.searchPlaceholder")}
                      value={assignmentSearch}
                      onChange={(e) => setAssignmentSearch(e.target.value)}
                      className="max-w-xs"
                    />
                    <Select
                      value={assignmentPeriodFilter}
                      onValueChange={(value) => setAssignmentPeriodFilter(value ?? "all")}
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue placeholder={t("studentProfile.assignments.allPeriods")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("studentProfile.assignments.allPeriods")}</SelectItem>
                        {assignmentPeriods.map((period) => (
                          <SelectItem key={period} value={period}>
                            {period}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-background">
                  <div className="min-h-0 flex-1 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("studentProfile.assignments.columns.assignment")}</TableHead>
                          <TableHead>{t("studentProfile.assignments.columns.period")}</TableHead>
                          <TableHead>{t("studentProfile.assignments.columns.score")}</TableHead>
                          <TableHead>{t("studentProfile.assignments.columns.date")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAssignments.map((assignment) => (
                          <TableRow key={assignment.assignment_id}>
                            <TableCell className="font-medium">{assignment.title}</TableCell>
                            <TableCell className="text-sm text-foreground/50">
                              {assignment.period_name}
                            </TableCell>
                            <TableCell className="text-sm">
                              {assignment.score !== null ? (
                                <span className={assignment.score > assignment.max_score ? "text-warning" : "text-foreground"}>
                                  {assignment.score}
                                </span>
                              ) : (
                                <span className="text-foreground/30">—</span>
                              )}
                              <span className="ml-0.5 text-xs text-muted">/ {assignment.max_score}</span>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm text-foreground/50">
                              {formatShortDate(assignment.created_at)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {filteredAssignments.length === 0 && (
                      <TableEmptyState
                        title={
                          assignments.length === 0
                            ? t("studentProfile.assignments.noAssignments")
                            : t("studentProfile.assignments.noResults")
                        }
                        hint={
                          assignments.length > 0
                            ? t("studentProfile.assignments.noResultsHint")
                            : undefined
                        }
                      />
                    )}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="attendance" className="flex min-h-0 flex-1 flex-col gap-4 pt-4">
            {loadingAttendance ? (
              <LoadingSpinner large />
            ) : (
              <>
                {attendanceDays.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                    {(
                      [
                        { key: "totalDays", value: attendanceSummary.totalDays, color: "text-foreground" },
                        { key: "present", value: attendanceSummary.present, color: "text-success" },
                        { key: "absent", value: attendanceSummary.absent, color: "text-danger" },
                        { key: "late", value: attendanceSummary.late, color: "text-warning" },
                        { key: "partial", value: attendanceSummary.partial, color: "text-secondary-foreground" },
                      ] as const
                    ).map(({ key, value, color }) => {
                      const isActive = attendanceFilter === key;
                      return (
                        <div
                          key={key}
                          className={cn(
                            "cursor-pointer rounded-xl border bg-background p-3 text-center transition-all select-none hover:ring-1 hover:ring-foreground/10",
                            isActive && "ring-2 ring-foreground/30",
                          )}
                          onClick={() => setAttendanceFilter(isActive ? null : key)}
                        >
                          <span className={cn("text-xl font-bold", color)}>{value}</span>
                          <div className="text-xs text-muted">
                            {t(`studentProfile.attendance.summary.${key}`)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-background">
                  <div className="min-h-0 flex-1 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("studentProfile.attendance.columns.date")}</TableHead>
                          <TableHead>{t("studentProfile.attendance.columns.status")}</TableHead>
                          <TableHead>{t("studentProfile.attendance.columns.time")}</TableHead>
                          <TableHead>{t("studentProfile.attendance.columns.periods")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAttendanceDays.map((day) => (
                          <TableRow key={day.date}>
                            <TableCell className="whitespace-nowrap font-medium">
                              {formatDateFromLocal(day.date)}
                            </TableCell>
                            <TableCell>
                              <span className={cn("text-sm font-medium", statusColors[day.dayStatus])}>
                                {t(`studentProfile.attendance.status.${day.dayStatus}`)}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-foreground/50">—</TableCell>
                            <TableCell className="text-sm text-foreground/50">
                              {day.records.map((record) => record.period_name).join(", ")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {filteredAttendanceDays.length === 0 && (
                      <TableEmptyState
                        title={t("studentProfile.attendance.noAttendance")}
                        hint={t("studentProfile.attendance.noAttendanceHint")}
                      />
                    )}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="visitations" className="flex min-h-0 flex-1 flex-col gap-4 pt-4">
            <div className="flex items-center justify-between">
              <Input
                placeholder={t("studentProfile.visitations.searchPlaceholder")}
                value={visitationSearch}
                onChange={(e) => setVisitationSearch(e.target.value)}
                className="max-w-xs"
              />
              <Button size="sm" onClick={() => setVisitationOpen(true)}>
                {t("studentProfile.visitations.logVisitation")}
              </Button>
            </div>

            {loadingVisitations ? (
              <LoadingSpinner large />
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-background">
                <div className="min-h-0 flex-1 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("studentProfile.visitations.columns.notes")}</TableHead>
                        <TableHead>{t("studentProfile.visitations.columns.visitor")}</TableHead>
                        <TableHead>{t("studentProfile.visitations.columns.relationship")}</TableHead>
                        <TableHead>{t("studentProfile.visitations.columns.date")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVisitations.map((visitation) => (
                        <TableRow key={visitation.id}>
                          <TableCell className="text-sm text-foreground/50">
                            {visitation.notes || "—"}
                          </TableCell>
                          <TableCell className="font-medium">{visitation.contact_name}</TableCell>
                          <TableCell className="text-sm text-foreground/50">
                            {visitation.contact_relationship || "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-foreground/50">
                            {formatVisitDate(visitation.visited_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filteredVisitations.length === 0 && (
                    <TableEmptyState
                      title={
                        visitations.length === 0
                          ? t("studentProfile.visitations.noVisitations")
                          : t("studentProfile.visitations.noResults")
                      }
                      hint={
                        visitations.length === 0
                          ? t("studentProfile.visitations.noVisitationsHint")
                          : t("studentProfile.visitations.noResultsHint", { search: visitationSearch })
                      }
                    />
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="notes" className="flex min-h-0 flex-1 flex-col gap-4 pt-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Input
                  placeholder={t("studentProfile.notes.searchPlaceholder")}
                  value={noteSearch}
                  onChange={(e) => setNoteSearch(e.target.value)}
                  className="max-w-xs"
                />
                <Select
                  value={noteTagFilter}
                  onValueChange={(value) => setNoteTagFilter((value as "all" | NoteTagKey | null) ?? "all")}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder={t("studentProfile.notes.tags.all")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("studentProfile.notes.tags.all")}</SelectItem>
                    {NOTE_TAG_KEYS.map((tag) => (
                      <SelectItem key={tag} value={tag}>
                        {t(`studentProfile.notes.tags.${tag}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" onClick={() => setNoteOpen(true)}>
                {t("studentProfile.notes.addNote")}
              </Button>
            </div>

            {loadingNotes ? (
              <LoadingSpinner large />
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-background">
                <div className="min-h-0 flex-1 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("studentProfile.notes.columns.note")}</TableHead>
                        <TableHead>{t("studentProfile.notes.columns.date")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredNotes.map((note) => {
                        const tags = parseTags(note.tags);
                        return (
                          <TableRow
                            key={note.id}
                            className="cursor-pointer"
                            onClick={() => openViewNoteDialog(note)}
                          >
                            <TableCell className="max-w-md whitespace-pre-wrap text-sm text-foreground">
                              {tags.length > 0 && (
                                <div className="mb-1.5 flex flex-wrap gap-1">
                                  {tags.map((tag) => (
                                    <Badge
                                      key={tag}
                                      className={NOTE_TAG_COLORS[tag].chip}
                                    >
                                      {t(`studentProfile.notes.tags.${tag}`)}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {note.content}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm text-foreground/50">
                              {formatNoteTimestamp(note.created_at)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {filteredNotes.length === 0 && (
                    <TableEmptyState
                      title={notes.length === 0 ? t("studentProfile.notes.noNotes") : t("studentProfile.notes.noResults")}
                      hint={
                        notes.length === 0
                          ? t("studentProfile.notes.noNotesHint")
                          : t("studentProfile.notes.noResultsHint", { search: noteSearch })
                      }
                    />
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog
          open={viewNoteOpen}
          onOpenChange={(open) => {
            if (!open && !editNoteSubmitting) closeViewNoteDialog();
          }}
        >
          <DialogContent>
            {isEditingNote ? (
              <form onSubmit={handleEditNoteSubmit}>
                <DialogHeader>
                  <DialogTitle>{t("notes.viewModal.editTitle")}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="edit-note-content">{t("studentProfile.addNoteModal.noteLabel")}</Label>
                    <textarea
                      id="edit-note-content"
                      value={editNoteContent}
                      onChange={(e) => setEditNoteContent(e.target.value)}
                      rows={5}
                      required
                      className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium">{t("studentProfile.addNoteModal.tagsLabel")}</span>
                    <div className="flex flex-wrap gap-2">
                      {NOTE_TAG_KEYS.map((tag) => {
                        const isActive = editNoteTags.includes(tag);
                        return (
                          <Badge
                            key={tag}
                            variant={isActive ? "default" : "outline"}
                            className={cn(
                              "cursor-pointer transition-transform active:scale-95",
                              isActive ? NOTE_TAG_COLORS[tag].active : NOTE_TAG_COLORS[tag].inactive,
                            )}
                            onClick={() =>
                              setEditNoteTags((prev) =>
                                isActive ? prev.filter((item) => item !== tag) : [...prev, tag],
                              )
                            }
                          >
                            {t(`studentProfile.notes.tags.${tag}`)}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                  {editNoteError && <p className="text-sm text-danger">{editNoteError}</p>}
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={editNoteSubmitting}
                    onClick={() => setIsEditingNote(false)}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" disabled={editNoteSubmitting || !editNoteContent.trim()}>
                    {editNoteSubmitting ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      t("common.save")
                    )}
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>{t("notes.viewModal.title")}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4">
                  {viewingNote && parseTags(viewingNote.tags).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {parseTags(viewingNote.tags).map((tag) => (
                        <Badge key={tag} className={NOTE_TAG_COLORS[tag].chip}>
                          {t(`studentProfile.notes.tags.${tag}`)}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap text-sm text-foreground">{viewingNote?.content}</p>
                  <p className="text-xs text-muted">
                    {viewingNote ? formatNoteTimestamp(viewingNote.created_at) : ""}
                  </p>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={closeViewNoteDialog}>
                    {t("common.cancel")}
                  </Button>
                  <Button type="button" variant="secondary" onClick={startEditingNote}>
                    <Pencil size={14} />
                    {t("notes.viewModal.edit")}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        <Dialog
          open={noteOpen}
          onOpenChange={(open) => {
            if (!open && !noteSubmitting) closeNoteDialog();
          }}
        >
          <DialogContent>
            <form onSubmit={handleAddNote}>
              <DialogHeader>
                <DialogTitle>{t("studentProfile.addNoteModal.title")}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="note-content">{t("studentProfile.addNoteModal.noteLabel")}</Label>
                  <textarea
                    id="note-content"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder={t("studentProfile.addNoteModal.notePlaceholder")}
                    rows={4}
                    required
                    className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">{t("studentProfile.addNoteModal.tagsLabel")}</span>
                  <div className="flex flex-wrap gap-2">
                    {NOTE_TAG_KEYS.map((tag) => {
                      const isActive = noteTags.includes(tag);
                      return (
                        <Badge
                          key={tag}
                          variant={isActive ? "default" : "outline"}
                          className={cn(
                            "cursor-pointer transition-transform active:scale-95",
                            isActive ? NOTE_TAG_COLORS[tag].active : NOTE_TAG_COLORS[tag].inactive,
                          )}
                          onClick={() =>
                            setNoteTags((prev) =>
                              isActive ? prev.filter((item) => item !== tag) : [...prev, tag],
                            )
                          }
                        >
                          {t(`studentProfile.notes.tags.${tag}`)}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
                {noteError && <p className="text-sm text-danger">{noteError}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={closeNoteDialog}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={noteSubmitting || !noteContent.trim()}>
                  {noteSubmitting ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    t("common.add")
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={visitationOpen}
          onOpenChange={(open) => {
            if (!open && !visitSubmitting) closeVisitationDialog();
          }}
        >
          <DialogContent className="overflow-visible">
            <form onSubmit={handleAddVisitation}>
              <DialogHeader>
                <DialogTitle>{t("studentProfile.logVisitationModal.title")}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <div className="flex flex-col gap-1.5">
                  <Label>{t("studentProfile.logVisitationModal.visitorLabel")}</Label>
                  <Select
                    value={selectedVisitorKey ?? undefined}
                    onValueChange={(value) => {
                      setSelectedVisitorKey(value ?? null);
                      setNewVisitorName("");
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={t("studentProfile.logVisitationModal.selectVisitor")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={String(contact.id)}>
                          <div className="flex flex-col">
                            <span className="text-sm">{contact.name}</span>
                            {contact.relationship && (
                              <span className="text-xs text-foreground/50">{contact.relationship}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                      <SelectItem value="new">
                        <span className="text-accent text-sm">
                          {t("studentProfile.logVisitationModal.newVisitor")}
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isNewVisitor && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="visit-new-name">
                      {t("studentProfile.logVisitationModal.visitorNameLabel")}
                    </Label>
                    <Input
                      id="visit-new-name"
                      value={newVisitorName}
                      onChange={(e) => setNewVisitorName(e.target.value)}
                      placeholder={t("studentProfile.logVisitationModal.visitorNamePlaceholder")}
                      autoFocus
                    />
                    <p className="text-xs text-accent">
                      {t("studentProfile.logVisitationModal.newContactHint")}
                    </p>
                  </div>
                )}

                <AppDatePicker
                  label={t("studentProfile.logVisitationModal.dateLabel")}
                  value={visitedAt}
                  onChange={setVisitedAt}
                  placeholder={t("studentProfile.logVisitationModal.dateLabel")}
                />

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="visit-notes">{t("studentProfile.logVisitationModal.notesLabel")}</Label>
                  <textarea
                    id="visit-notes"
                    value={visitNotes}
                    onChange={(e) => setVisitNotes(e.target.value)}
                    placeholder={t("studentProfile.logVisitationModal.notesPlaceholder")}
                    rows={4}
                    className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  />
                </div>

                {visitError && <p className="text-sm text-danger">{visitError}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={closeVisitationDialog}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={!canSubmitVisitation}>
                  {visitSubmitting ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    t("common.log")
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
