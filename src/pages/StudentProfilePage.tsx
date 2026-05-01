import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Breadcrumb } from "../components/Breadcrumb";
import { PageBackButton } from "../components/PageBackButton";
import { useAddresses } from "../hooks/useAddresses";
import { useContacts } from "../hooks/useContacts";
import { useNotes } from "../hooks/useNotes";
import { useStudentAccommodations } from "../hooks/useStudentAccommodations";
import { useStudentAssignmentPreviews } from "../hooks/useStudentAssignmentPreviews";
import { useStudentAttendance } from "../hooks/useStudentAttendance";
import { useStudentInfo } from "../hooks/useStudentInfo";
import { useStudentObservations } from "../hooks/useStudentObservations";
import { useStudentServices } from "../hooks/useStudentServices";
import { useVisitations } from "../hooks/useVisitations";
import { useTranslation } from "../i18n/LanguageContext";
import type { DayAttendanceStatus } from "../types/attendance";
import type { Group } from "../types/group";
import {
  parseTags,
  serializeTags,
  type Note,
  type NoteTagKey,
} from "../types/note";
import type { Student } from "../types/student";
import { AssignmentsTab } from "./student-profile/AssignmentsTab";
import { AttendanceTab } from "./student-profile/AttendanceTab";
import { AddNoteDialog, ViewNoteDialog } from "./student-profile/NoteDialogs";
import { NotesTab } from "./student-profile/NotesTab";
import { OverviewTab } from "./student-profile/OverviewTab";
import { VisitationsTab } from "./student-profile/VisitationsTab";
import { VisitationDialog } from "./student-profile/VisitationDialog";
import { todayDateString } from "./student-profile/utils";

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
  const { visitations, loading: loadingVisitations, addVisitation } = useVisitations(
    student.id,
  );
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

  const assignmentPeriods = Array.from(
    new Set(assignments.map((assignment) => assignment.period_name)),
  ).sort();

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
      note.content.toLowerCase().includes(query) ||
      note.tags.toLowerCase().includes(query);
    const matchesTag =
      noteTagFilter === "all" || parseTags(note.tags).includes(noteTagFilter);
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
      await addNote({
        content: noteContent.trim(),
        tags: serializeTags(noteTags),
      });
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
            observations.obs_reading_writing
              ? t("studentProfile.observations.readingWriting")
              : "",
            observations.obs_mirror_numbers
              ? t("studentProfile.observations.mirrorNumbers")
              : "",
            observations.obs_left_right_confusion
              ? t("studentProfile.observations.leftRightConfusion")
              : "",
            observations.obs_sequence_difficulty
              ? t("studentProfile.observations.sequenceDifficulty")
              : "",
          ].filter(Boolean),
        },
        {
          label: t("studentProfile.observations.addAdhd"),
          items: [
            observations.obs_disorganized_work
              ? t("studentProfile.observations.disorganizedWork")
              : "",
            observations.obs_inattention_detail
              ? t("studentProfile.observations.inattentionDetail")
              : "",
            observations.obs_sustained_attention
              ? t("studentProfile.observations.sustainedAttention")
              : "",
            observations.obs_doesnt_listen
              ? t("studentProfile.observations.doesntListen")
              : "",
            observations.obs_task_organization
              ? t("studentProfile.observations.taskOrganization")
              : "",
            observations.obs_loses_belongings
              ? t("studentProfile.observations.losesbelongings")
              : "",
            observations.obs_distracted_stimuli
              ? t("studentProfile.observations.distractedStimuli")
              : "",
            observations.obs_forgetful ? t("studentProfile.observations.forgetful") : "",
            observations.obs_excess_hand_foot
              ? t("studentProfile.observations.excessHandFoot")
              : "",
            observations.obs_gets_up_from_seat
              ? t("studentProfile.observations.getsUpFromSeat")
              : "",
            observations.obs_running_jumping
              ? t("studentProfile.observations.runningJumping")
              : "",
            observations.obs_talks_excessively
              ? t("studentProfile.observations.talksExcessively")
              : "",
            observations.obs_difficulty_quiet
              ? t("studentProfile.observations.difficultyQuiet")
              : "",
            observations.obs_driven_by_motor
              ? t("studentProfile.observations.drivenByMotor")
              : "",
            observations.obs_impulsive_answers
              ? t("studentProfile.observations.impulsiveAnswers")
              : "",
            observations.obs_difficulty_waiting
              ? t("studentProfile.observations.difficultyWaiting")
              : "",
            observations.obs_interrupts_others
              ? t("studentProfile.observations.interruptsOthers")
              : "",
          ].filter(Boolean),
        },
        {
          label: t("studentProfile.observations.oppositionalSocial"),
          items: [
            observations.obs_easily_angered
              ? t("studentProfile.observations.easilyAngered")
              : "",
            observations.obs_argues ? t("studentProfile.observations.argues") : "",
            observations.obs_defies_adults
              ? t("studentProfile.observations.defiesAdults")
              : "",
            observations.obs_annoys_others
              ? t("studentProfile.observations.annoysOthers")
              : "",
            observations.obs_aggressive
              ? t("studentProfile.observations.aggressive")
              : "",
            observations.obs_spiteful ? t("studentProfile.observations.spiteful") : "",
            observations.obs_blames_others
              ? t("studentProfile.observations.blamesOthers")
              : "",
            observations.obs_breaks_property
              ? t("studentProfile.observations.breaksProperty")
              : "",
          ].filter(Boolean),
        },
        {
          label: t("studentProfile.observations.other"),
          items: [
            observations.obs_incomplete_homework
              ? t("studentProfile.observations.incompleteHomework")
              : "",
            observations.obs_frequent_absences
              ? t("studentProfile.observations.frequentAbsences")
              : "",
            observations.obs_neglected_appearance
              ? t("studentProfile.observations.neglectedAppearance")
              : "",
            observations.obs_uses_profanity
              ? t("studentProfile.observations.usesProfanity")
              : "",
            observations.obs_takes_belongings
              ? t("studentProfile.observations.takesBelongings")
              : "",
            observations.obs_forgets_materials
              ? t("studentProfile.observations.forgetsMaterials")
              : "",
            observations.obs_appears_sad
              ? t("studentProfile.observations.appearsSad")
              : "",
          ].filter(Boolean),
        },
      ].filter((groupItem) => groupItem.items.length > 0)
    : [];

  const statusColors: Record<DayAttendanceStatus, string> = {
    present: "text-success",
    absent: "text-danger",
    late: "text-warning",
    partial: "text-chart-4",
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

  const hasHealthContent = Boolean(
    services &&
      (services.has_special_education ||
        therapyLabels.length > 0 ||
        services.medical_plan !== "none" ||
        services.has_treatment ||
        services.allergies ||
        services.conditions),
  );

  const hasAccommodationContent = Boolean(
    accommodations &&
      (accommodations.desk_placement ||
        accommodations.extended_time ||
        accommodations.shorter_assignments ||
        accommodations.use_abacus ||
        accommodations.simple_instructions ||
        accommodations.visual_examples),
  );

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col px-6 pt-8 pb-6 pl-3">
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
            <div className="flex items-center gap-3">
              <PageBackButton
                label={t("common.back")}
                onClick={onGoToStudents}
              />
              <h2 className="text-2xl font-bold">{student.name}</h2>
            </div>

            <TabsList variant="line" aria-label="Student sections" className="flex-wrap">
              <TabsTrigger value="overview">{t("studentProfile.tabs.overview")}</TabsTrigger>
              <TabsTrigger value="assignments">
                {t("studentProfile.tabs.assignments")}
              </TabsTrigger>
              <TabsTrigger value="attendance">
                {t("studentProfile.tabs.attendance")}
              </TabsTrigger>
              <TabsTrigger value="visitations">
                {t("studentProfile.tabs.visitations")}
              </TabsTrigger>
              <TabsTrigger value="notes">{t("studentProfile.tabs.notes")}</TabsTrigger>
            </TabsList>
          </div>

          <OverviewTab
            student={s}
            group={group}
            assignments={assignments}
            loadingAssignments={loadingAssignments}
            attendanceSummary={attendanceSummary}
            loadingAttendance={loadingAttendance}
            contacts={contacts}
            loadingContacts={loadingContacts}
            addresses={addresses}
            loadingAddresses={loadingAddresses}
            services={services}
            loadingServices={loadingServices}
            accommodations={accommodations}
            loadingAccommodations={loadingAccommodations}
            observationGroups={observationGroups}
            loadingObservations={loadingObservations}
            therapyLabels={therapyLabels}
            hasHealthContent={hasHealthContent}
            hasAccommodationContent={hasAccommodationContent}
            onGoToStudentInfo={onGoToStudentInfo}
            onGoToContacts={onGoToContacts}
            onGoToAddresses={onGoToAddresses}
            onGoToServices={onGoToServices}
            onGoToAccommodations={onGoToAccommodations}
            onGoToObservations={onGoToObservations}
          />

          <AssignmentsTab
            assignments={assignments}
            loadingAssignments={loadingAssignments}
            filteredAssignments={filteredAssignments}
            assignmentSearch={assignmentSearch}
            onAssignmentSearchChange={setAssignmentSearch}
            assignmentPeriods={assignmentPeriods}
            assignmentPeriodFilter={assignmentPeriodFilter}
            onAssignmentPeriodFilterChange={setAssignmentPeriodFilter}
          />

          <AttendanceTab
            loadingAttendance={loadingAttendance}
            attendanceDays={attendanceDays}
            attendanceSummary={attendanceSummary}
            attendanceFilter={attendanceFilter}
            onAttendanceFilterChange={setAttendanceFilter}
            filteredAttendanceDays={filteredAttendanceDays}
            statusColors={statusColors}
          />

          <VisitationsTab
            visitationSearch={visitationSearch}
            onVisitationSearchChange={setVisitationSearch}
            onOpenVisitation={() => setVisitationOpen(true)}
            loadingVisitations={loadingVisitations}
            visitations={visitations}
            filteredVisitations={filteredVisitations}
          />

          <NotesTab
            noteSearch={noteSearch}
            onNoteSearchChange={setNoteSearch}
            noteTagFilter={noteTagFilter}
            onNoteTagFilterChange={setNoteTagFilter}
            onOpenNote={() => setNoteOpen(true)}
            loadingNotes={loadingNotes}
            notes={notes}
            filteredNotes={filteredNotes}
            onOpenViewNote={openViewNoteDialog}
          />
        </Tabs>

        <ViewNoteDialog
          open={viewNoteOpen}
          viewingNote={viewingNote}
          isEditingNote={isEditingNote}
          editNoteContent={editNoteContent}
          editNoteTags={editNoteTags}
          editNoteSubmitting={editNoteSubmitting}
          editNoteError={editNoteError}
          setEditNoteContent={setEditNoteContent}
          setEditNoteTags={setEditNoteTags}
          setIsEditingNote={setIsEditingNote}
          onClose={closeViewNoteDialog}
          onStartEditing={startEditingNote}
          onSubmit={handleEditNoteSubmit}
        />

        <AddNoteDialog
          open={noteOpen}
          noteContent={noteContent}
          noteTags={noteTags}
          noteSubmitting={noteSubmitting}
          noteError={noteError}
          setNoteContent={setNoteContent}
          setNoteTags={setNoteTags}
          onClose={closeNoteDialog}
          onSubmit={handleAddNote}
        />

        <VisitationDialog
          open={visitationOpen}
          visitSubmitting={visitSubmitting}
          contacts={contacts}
          selectedVisitorKey={selectedVisitorKey}
          setSelectedVisitorKey={setSelectedVisitorKey}
          newVisitorName={newVisitorName}
          setNewVisitorName={setNewVisitorName}
          isNewVisitor={isNewVisitor}
          visitNotes={visitNotes}
          setVisitNotes={setVisitNotes}
          visitedAt={visitedAt}
          setVisitedAt={setVisitedAt}
          visitError={visitError}
          canSubmitVisitation={canSubmitVisitation}
          onClose={closeVisitationDialog}
          onSubmit={handleAddVisitation}
        />
      </div>
    </TooltipProvider>
  );
}
