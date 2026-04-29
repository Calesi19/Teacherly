import { useState, useEffect, useRef } from "react";
import { useTranslation } from "../i18n/LanguageContext";
import { Button, Surface, Select, ListBox, DatePicker, DateField, Calendar, Label } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import type { DateValue } from "@internationalized/date";
import { FileText, FolderOpen, CheckCircle, AlertCircle } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { invoke } from "@tauri-apps/api/core";
import { dirname } from "@tauri-apps/api/path";
import { save } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { PdfDocument } from "../reports/PdfDocument";
// Group sections
import { StudentRosterSection } from "../reports/sections/StudentRosterSection";
import { AttendanceSummarySection } from "../reports/sections/AttendanceSummarySection";
import { GradeSummarySection } from "../reports/sections/GradeSummarySection";
// Individual sections
import { StudentProfileSection } from "../reports/sections/StudentProfileSection";
import { ContactsSection } from "../reports/sections/ContactsSection";
import { AddressesSection } from "../reports/sections/AddressesSection";
import { ServicesSection } from "../reports/sections/ServicesSection";
import { AccommodationsSection } from "../reports/sections/AccommodationsSection";
import { ObservationsSection } from "../reports/sections/ObservationsSection";
import { NotesSection } from "../reports/sections/NotesSection";
import { AttendanceRecordsSection } from "../reports/sections/AttendanceRecordsSection";
import { StudentAttendanceSummarySection } from "../reports/sections/StudentAttendanceSummarySection";
import { GradesSection } from "../reports/sections/GradesSection";
import { StudentGradeSummarySection } from "../reports/sections/StudentGradeSummarySection";
// Group data
import {
  fetchStudentsForReport,
  fetchAttendanceSummary,
  fetchGradeSummary,
  fetchDistinctPeriods,
} from "../reports/fetchGroupReportData";
// Individual data
import {
  fetchStudentProfile,
  fetchStudentContacts,
  fetchStudentAddresses,
  fetchStudentServices,
  fetchStudentAccommodations,
  fetchStudentObservations,
  fetchStudentNotes,
  fetchStudentAttendanceSummary,
  fetchStudentAttendanceRecords,
  fetchStudentGrades,
  fetchStudentCourseSummary,
  fetchStudentDistinctPeriods,
} from "../reports/fetchStudentReportData";
import type { Group } from "../types/group";
import type { Student } from "../types/student";
import { NOTE_TAG_KEYS } from "../types/note";
import { REPORTS_LAST_DIR_KEY } from "../appConfig";
const PREVIEW_DEBOUNCE_MS = 700;

type Scope = "group" | "individual";
type GroupSectionId = "roster" | "attendance" | "grades";
type StudentSectionId =
  | "profile"
  | "contacts"
  | "addresses"
  | "services"
  | "accommodations"
  | "observations"
  | "notes"
  | "student-attendance-summary"
  | "student-attendance"
  | "student-grades"
  | "student-grade-summary";
type SectionId = GroupSectionId | StudentSectionId;

interface ReportsPageProps {
  group: Group;
}

function ReportDatePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const parsed = value ? parseDate(value) : null;

  return (
    <div className="min-w-0 flex-1 flex flex-col gap-1">
      <Label className="text-[11px] text-foreground/50">{label}</Label>
      <DatePicker
        className="w-full"
        aria-label={label}
        value={parsed}
        onChange={(date: DateValue | null) => onChange(date ? date.toString() : "")}
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
          <Calendar aria-label={label}>
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
                {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
              </Calendar.GridHeader>
              <Calendar.GridBody>
                {(date) => <Calendar.Cell date={date} />}
              </Calendar.GridBody>
            </Calendar.Grid>
            <Calendar.YearPickerGrid>
              <Calendar.YearPickerGridBody>
                {({ year }) => <Calendar.YearPickerCell year={year} />}
              </Calendar.YearPickerGridBody>
            </Calendar.YearPickerGrid>
          </Calendar>
        </DatePicker.Popover>
      </DatePicker>
    </div>
  );
}

export function ReportsPage({ group }: ReportsPageProps) {
  const { t, language } = useTranslation();

  // Scope & selection
  const [scope, setScope] = useState<Scope>("group");
  const [groupStudents, setGroupStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  // Shared section toggle state
  const [sections, setSections] = useState<Set<SectionId>>(new Set());

  // Group section filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [gradesPeriod, setGradesPeriod] = useState("");
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);

  // Individual section filters
  const [noteTagFilter, setNoteTagFilter] = useState("");
  const [studentDateFrom, setStudentDateFrom] = useState("");
  const [studentDateTo, setStudentDateTo] = useState("");
  const [studentAttendanceStatuses, setStudentAttendanceStatuses] = useState<Set<string>>(
    new Set(["present", "absent", "late", "early_pickup"])
  );
  const [studentSummaryDateFrom, setStudentSummaryDateFrom] = useState(() => group.start_date ?? "");
  const [studentSummaryDateTo, setStudentSummaryDateTo] = useState(() => {
    const today = new Date().toISOString().slice(0, 10);
    return group.end_date && today > group.end_date ? group.end_date : today;
  });
  const [studentGradesPeriod, setStudentGradesPeriod] = useState("");
  const [studentAvailablePeriods, setStudentAvailablePeriods] = useState<string[]>([]);

  // UI state
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; filePath?: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stagedPreviewUrl, setStagedPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewUrlsRef = useRef<Set<string>>(new Set());
  const previewUrlRef = useRef<string | null>(null);
  const stagedPreviewUrlRef = useRef<string | null>(null);

  // Load group students on mount for the student picker
  useEffect(() => {
    fetchStudentsForReport(group.id).then(setGroupStudents).catch(() => {});
    fetchDistinctPeriods(group.id).then(setAvailablePeriods).catch(() => {});
    setResult(null);
    // Reset attendance summary date range to the group's default dates
    setStudentSummaryDateFrom(group.start_date ?? "");
    const today = new Date().toISOString().slice(0, 10);
    setStudentSummaryDateTo(group.end_date && today > group.end_date ? group.end_date : today);
  }, [group.id]);

  // Load student-specific periods when a student is selected
  useEffect(() => {
    if (selectedStudentId !== null) {
      fetchStudentDistinctPeriods(selectedStudentId).then(setStudentAvailablePeriods).catch(() => {});
    } else {
      setStudentAvailablePeriods([]);
    }
    setStudentGradesPeriod("");
  }, [selectedStudentId]);

  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);

  useEffect(() => {
    stagedPreviewUrlRef.current = stagedPreviewUrl;
  }, [stagedPreviewUrl]);

  // Revoke blob URL on unmount
  useEffect(() => {
    return () => {
      for (const url of previewUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      previewUrlsRef.current.clear();
    };
  }, []);

  // Debounced live preview
  useEffect(() => {
    const needsStudent = scope === "individual" && !selectedStudentId;
    if (sections.size === 0 || needsStudent) {
      for (const url of previewUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      previewUrlsRef.current.clear();
      setPreviewUrl(null);
      setStagedPreviewUrl(null);
      setPreviewLoading(false);
      return;
    }

    setPreviewLoading(true);
    let cancelled = false;

    const timer = setTimeout(async () => {
      let nextUrl: string | null = null;

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let doc: React.ReactElement<any>;

        if (scope === "group") {
          const [students, attendanceRows, gradeData] = await Promise.all([
            sections.has("roster") ? fetchStudentsForReport(group.id) : Promise.resolve(null),
            sections.has("attendance")
              ? fetchAttendanceSummary(group.id, dateFrom || undefined, dateTo || undefined)
              : Promise.resolve(null),
            sections.has("grades")
              ? fetchGradeSummary(group.id, gradesPeriod || undefined)
              : Promise.resolve(null),
          ]);
          if (cancelled) return;
          doc = (
            <PdfDocument
              title={t("reports.pdf.groupReport")}
              groupName={group.name}
              schoolName={group.school_name}
              generatedDate={new Date().toLocaleDateString()}
              language={language}
            >
              {students ? <StudentRosterSection students={students} language={language} /> : null}
              {attendanceRows ? (
                <AttendanceSummarySection
                  rows={attendanceRows}
                  dateFrom={dateFrom || undefined}
                  dateTo={dateTo || undefined}
                  language={language}
                />
              ) : null}
              {gradeData ? (
                <GradeSummarySection assignments={gradeData} periodFilter={gradesPeriod || undefined} language={language} />
              ) : null}
            </PdfDocument>
          );
        } else {
          const sid = selectedStudentId!;
          const [student, contacts, addresses, services, accommodations, observations, notes, attendanceSummary, attendanceRecords, grades, courseSummary] =
            await Promise.all([
              fetchStudentProfile(sid),
              sections.has("contacts") ? fetchStudentContacts(sid) : Promise.resolve(null),
              sections.has("addresses") ? fetchStudentAddresses(sid) : Promise.resolve(null),
              sections.has("services") ? fetchStudentServices(sid) : Promise.resolve(null),
              sections.has("accommodations") ? fetchStudentAccommodations(sid) : Promise.resolve(null),
              sections.has("observations") ? fetchStudentObservations(sid) : Promise.resolve(null),
              sections.has("notes")
                ? fetchStudentNotes(sid, noteTagFilter || undefined)
                : Promise.resolve(null),
              sections.has("student-attendance-summary")
                ? fetchStudentAttendanceSummary(sid, studentSummaryDateFrom || undefined, studentSummaryDateTo || undefined)
                : Promise.resolve(null),
              sections.has("student-attendance")
                ? fetchStudentAttendanceRecords(sid, studentDateFrom || undefined, studentDateTo || undefined)
                : Promise.resolve(null),
              sections.has("student-grades")
                ? fetchStudentGrades(sid, studentGradesPeriod || undefined)
                : Promise.resolve(null),
              sections.has("student-grade-summary")
                ? fetchStudentCourseSummary(sid)
                : Promise.resolve(null),
            ]);
          if (cancelled) return;
          const filteredRecords = attendanceRecords
            ? attendanceRecords.filter((r) => studentAttendanceStatuses.has(r.status))
            : null;
          doc = (
            <PdfDocument
              title={`${student?.name ?? t("reports.pdf.studentFallback")} — ${t("reports.pdf.studentReport")}`}
              groupName={group.name}
              schoolName={group.school_name}
              generatedDate={new Date().toLocaleDateString()}
              language={language}
            >
              {sections.has("profile") && student ? <StudentProfileSection student={student} language={language} /> : null}
              {contacts ? <ContactsSection contacts={contacts} language={language} /> : null}
              {addresses ? <AddressesSection addresses={addresses} language={language} /> : null}
              {services !== null && sections.has("services") ? <ServicesSection services={services} language={language} /> : null}
              {accommodations !== null && sections.has("accommodations") ? (
                <AccommodationsSection accommodations={accommodations} language={language} />
              ) : null}
              {observations !== null && sections.has("observations") ? (
                <ObservationsSection observations={observations} language={language} />
              ) : null}
              {notes ? <NotesSection notes={notes} tagFilter={noteTagFilter || undefined} language={language} /> : null}
              {attendanceSummary ? (
                <StudentAttendanceSummarySection
                  summary={attendanceSummary}
                  dateFrom={studentSummaryDateFrom || undefined}
                  dateTo={studentSummaryDateTo || undefined}
                  language={language}
                />
              ) : null}
              {filteredRecords ? (
                <AttendanceRecordsSection
                  records={filteredRecords}
                  dateFrom={studentDateFrom || undefined}
                  dateTo={studentDateTo || undefined}
                  language={language}
                />
              ) : null}
              {courseSummary ? <StudentGradeSummarySection courses={courseSummary} language={language} /> : null}
              {grades ? <GradesSection grades={grades} periodFilter={studentGradesPeriod || undefined} language={language} /> : null}
            </PdfDocument>
          );
        }

        const blob = await pdf(doc).toBlob();
        if (cancelled) return;

        nextUrl = URL.createObjectURL(blob);
        previewUrlsRef.current.add(nextUrl);

        const previousStagedUrl = stagedPreviewUrlRef.current;
        if (previousStagedUrl && previousStagedUrl !== nextUrl) {
          URL.revokeObjectURL(previousStagedUrl);
          previewUrlsRef.current.delete(previousStagedUrl);
        }

        setStagedPreviewUrl(nextUrl);
      } catch {
        // silent — generation errors show on the Generate button
        if (!cancelled) setPreviewLoading(false);
      } finally {
        if (cancelled && nextUrl) {
          URL.revokeObjectURL(nextUrl);
          previewUrlsRef.current.delete(nextUrl);
        }
      }
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    sections, scope, selectedStudentId,
    dateFrom, dateTo, gradesPeriod,
    noteTagFilter, studentDateFrom, studentDateTo, studentAttendanceStatuses,
    studentSummaryDateFrom, studentSummaryDateTo, studentGradesPeriod,
    group.id, group.name, group.school_name,
  ]);

  function handleStagedPreviewLoad() {
    const nextPreviewUrl = stagedPreviewUrlRef.current;
    if (!nextPreviewUrl) return;

    const previousPreviewUrl = previewUrlRef.current;
    setPreviewUrl(nextPreviewUrl);
    setStagedPreviewUrl(null);
    setPreviewLoading(false);

    if (previousPreviewUrl) {
      URL.revokeObjectURL(previousPreviewUrl);
      previewUrlsRef.current.delete(previousPreviewUrl);
    }
  }

  function toggleSection(id: SectionId, on: boolean) {
    setSections((prev) => {
      const next = new Set(prev);
      on ? next.add(id) : next.delete(id);
      return next;
    });
  }

  function switchScope(next: Scope) {
    setScope(next);
    setSections(new Set());
    setResult(null);
  }

  async function handleGenerate() {
    const sid = selectedStudentId;
    if (sections.size === 0) return;
    if (scope === "individual" && !sid) return;
    setGenerating(true);
    setResult(null);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let doc: React.ReactElement<any>;
      let filename: string;

      if (scope === "group") {
        const [students, attendanceRows, gradeData] = await Promise.all([
          sections.has("roster") ? fetchStudentsForReport(group.id) : Promise.resolve(null),
          sections.has("attendance")
            ? fetchAttendanceSummary(group.id, dateFrom || undefined, dateTo || undefined)
            : Promise.resolve(null),
          sections.has("grades")
            ? fetchGradeSummary(group.id, gradesPeriod || undefined)
            : Promise.resolve(null),
        ]);
        doc = (
          <PdfDocument
            title={t("reports.pdf.groupReport")}
            groupName={group.name}
            schoolName={group.school_name}
            generatedDate={new Date().toLocaleDateString()}
            language={language}
          >
            {students ? <StudentRosterSection students={students} language={language} /> : null}
            {attendanceRows ? (
              <AttendanceSummarySection
                rows={attendanceRows}
                dateFrom={dateFrom || undefined}
                dateTo={dateTo || undefined}
                language={language}
              />
            ) : null}
            {gradeData ? (
              <GradeSummarySection assignments={gradeData} periodFilter={gradesPeriod || undefined} language={language} />
            ) : null}
          </PdfDocument>
        );
        const safeName = group.name.replace(/[^a-z0-9]/gi, "-").toLowerCase();
        const ts = new Date().toISOString().slice(0, 10);
        filename = `group-${safeName}-${ts}.pdf`;
      } else {
        const [student, contacts, addresses, services, accommodations, observations, notes, attendanceSummary, attendanceRecords, grades, courseSummary] =
          await Promise.all([
            fetchStudentProfile(sid!),
            sections.has("contacts") ? fetchStudentContacts(sid!) : Promise.resolve(null),
            sections.has("addresses") ? fetchStudentAddresses(sid!) : Promise.resolve(null),
            sections.has("services") ? fetchStudentServices(sid!) : Promise.resolve(null),
            sections.has("accommodations") ? fetchStudentAccommodations(sid!) : Promise.resolve(null),
            sections.has("observations") ? fetchStudentObservations(sid!) : Promise.resolve(null),
            sections.has("notes")
              ? fetchStudentNotes(sid!, noteTagFilter || undefined)
              : Promise.resolve(null),
            sections.has("student-attendance-summary")
              ? fetchStudentAttendanceSummary(sid!, studentSummaryDateFrom || undefined, studentSummaryDateTo || undefined)
              : Promise.resolve(null),
            sections.has("student-attendance")
              ? fetchStudentAttendanceRecords(sid!, studentDateFrom || undefined, studentDateTo || undefined)
              : Promise.resolve(null),
            sections.has("student-grades")
              ? fetchStudentGrades(sid!, studentGradesPeriod || undefined)
              : Promise.resolve(null),
            sections.has("student-grade-summary")
              ? fetchStudentCourseSummary(sid!)
              : Promise.resolve(null),
          ]);
        const filteredRecords = attendanceRecords
          ? attendanceRecords.filter((r) => studentAttendanceStatuses.has(r.status))
          : null;
        doc = (
          <PdfDocument
            title={`${student?.name ?? t("reports.pdf.studentFallback")} — ${t("reports.pdf.studentReport")}`}
            groupName={group.name}
            schoolName={group.school_name}
            generatedDate={new Date().toLocaleDateString()}
            language={language}
          >
            {sections.has("profile") && student ? <StudentProfileSection student={student} language={language} /> : null}
            {contacts ? <ContactsSection contacts={contacts} language={language} /> : null}
            {addresses ? <AddressesSection addresses={addresses} language={language} /> : null}
            {services !== null && sections.has("services") ? <ServicesSection services={services} language={language} /> : null}
            {accommodations !== null && sections.has("accommodations") ? (
              <AccommodationsSection accommodations={accommodations} language={language} />
            ) : null}
            {observations !== null && sections.has("observations") ? (
              <ObservationsSection observations={observations} language={language} />
            ) : null}
            {notes ? <NotesSection notes={notes} tagFilter={noteTagFilter || undefined} language={language} /> : null}
            {attendanceSummary ? (
              <StudentAttendanceSummarySection
                summary={attendanceSummary}
                dateFrom={studentSummaryDateFrom || undefined}
                dateTo={studentSummaryDateTo || undefined}
                language={language}
              />
            ) : null}
            {filteredRecords ? (
              <AttendanceRecordsSection
                records={filteredRecords}
                dateFrom={studentDateFrom || undefined}
                dateTo={studentDateTo || undefined}
                language={language}
              />
            ) : null}
            {courseSummary ? <StudentGradeSummarySection courses={courseSummary} language={language} /> : null}
            {grades ? <GradesSection grades={grades} periodFilter={studentGradesPeriod || undefined} language={language} /> : null}
          </PdfDocument>
        );
        const safeName = (student?.name ?? "student").replace(/[^a-z0-9]/gi, "-").toLowerCase();
        const ts = new Date().toISOString().slice(0, 10);
        filename = `student-${safeName}-${ts}.pdf`;
      }

      const blob = await pdf(doc).toBlob();
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const base64 = btoa(Array.from(bytes).map((b) => String.fromCharCode(b)).join(""));

      const lastDir = localStorage.getItem(REPORTS_LAST_DIR_KEY) ?? undefined;
      const defaultPath = lastDir ? `${lastDir}/${filename}` : filename;
      const filePath = await save({
        defaultPath,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });

      if (!filePath) {
        setGenerating(false);
        return;
      }

      await invoke("write_pdf", { path: filePath, dataBase64: base64 });

      const savedDir = await dirname(filePath);
      localStorage.setItem(REPORTS_LAST_DIR_KEY, savedDir);

      setResult({ ok: true, message: filePath, filePath });
    } catch (err) {
      setResult({ ok: false, message: String(err) });
    } finally {
      setGenerating(false);
    }
  }

  const canGenerate =
    sections.size > 0 &&
    !generating &&
    (scope === "group" || selectedStudentId !== null);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border shrink-0">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText size={22} />
          {t("reports.ui.title")}
        </h2>
        <p className="text-sm text-muted mt-0.5">
          {t("reports.ui.description")}
        </p>
      </div>

      {/* Split layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left: controls */}
        <div className="w-88 shrink-0 border-r border-border flex flex-col overflow-y-auto">
          <div className="p-5 flex flex-col gap-4">

            {/* Scope toggle */}
            <div className="flex gap-1 p-1 bg-foreground/5 rounded-lg">
              {(["group", "individual"] as Scope[]).map((s) => (
                <button
                  key={s}
                  onClick={() => switchScope(s)}
                  className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${
                    scope === s
                      ? "bg-background shadow-sm text-foreground"
                      : "text-foreground/50 hover:text-foreground/70"
                  }`}
                >
                  {s === "group" ? t("reports.ui.scopeGroup") : t("reports.ui.scopeStudent")}
                </button>
              ))}
            </div>

            {/* Group scope */}
            {scope === "group" && (
              <>
                <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wide">
                  {t("reports.ui.sections")}
                </p>

                <SectionToggle
                  id="roster"
                  label={t("reports.ui.rosterLabel")}
                  description={t("reports.ui.rosterDescription")}
                  checked={sections.has("roster")}
                  onChange={(v) => toggleSection("roster", v)}
                />

                <SectionToggle
                  id="attendance"
                  label={t("reports.ui.attendanceSummaryLabel")}
                  description={t("reports.ui.attendanceSummaryDescription")}
                  checked={sections.has("attendance")}
                  onChange={(v) => toggleSection("attendance", v)}
                >
                  {sections.has("attendance") && (
                    <div className="mt-2 flex flex-col gap-1.5">
                      <span className="text-xs text-foreground/50">{t("reports.ui.dateRange")}</span>
                      <div className="flex flex-col gap-2">
                        <ReportDatePicker label={t("reports.ui.dateFrom")} value={dateFrom} onChange={setDateFrom} />
                        <ReportDatePicker label={t("reports.ui.dateTo")} value={dateTo} onChange={setDateTo} />
                      </div>
                    </div>
                  )}
                </SectionToggle>

                <SectionToggle
                  id="grades"
                  label={t("reports.ui.gradeSummaryLabel")}
                  description={t("reports.ui.gradeSummaryDescription")}
                  checked={sections.has("grades")}
                  onChange={(v) => toggleSection("grades", v)}
                >
                  {sections.has("grades") && availablePeriods.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1.5">
                      <span className="text-xs text-foreground/50">{t("reports.ui.period")}</span>
                      <Select
                        aria-label="Period filter"
                        selectedKey={gradesPeriod || "__all__"}
                        onSelectionChange={(k) => setGradesPeriod(k === "__all__" ? "" : String(k))}
                        className="w-full"
                      >
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            <ListBox.Item id="__all__" textValue={t("reports.ui.allPeriods")}>{t("reports.ui.allPeriods")}</ListBox.Item>
                            {availablePeriods.map((p) => (
                              <ListBox.Item key={p} id={p} textValue={p}>{p}</ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    </div>
                  )}
                </SectionToggle>
              </>
            )}

            {/* Individual scope */}
            {scope === "individual" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-foreground/40 uppercase tracking-wide">
                    {t("reports.ui.student")}
                  </span>
                  <Select
                    aria-label="Select student"
                    selectedKey={selectedStudentId !== null ? String(selectedStudentId) : "__none__"}
                    onSelectionChange={(k) => {
                      const next = k === "__none__" ? null : Number(k);
                      setSelectedStudentId(next);
                      setSections(new Set());
                      setResult(null);
                    }}
                    className="w-full"
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {groupStudents.map((s) => (
                          <ListBox.Item key={s.id} id={String(s.id)} textValue={s.name}>
                            {s.name}
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>

                {selectedStudentId !== null && (
                  <>
                    <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wide">
                      {t("reports.ui.sections")}
                    </p>

                    <SectionToggle
                      id="profile"
                      label={t("reports.ui.profileLabel")}
                      description={t("reports.ui.profileDescription")}
                      checked={sections.has("profile")}
                      onChange={(v) => toggleSection("profile", v)}
                    />

                    <SectionToggle
                      id="contacts"
                      label={t("reports.ui.contactsLabel")}
                      description={t("reports.ui.contactsDescription")}
                      checked={sections.has("contacts")}
                      onChange={(v) => toggleSection("contacts", v)}
                    />

                    <SectionToggle
                      id="addresses"
                      label={t("reports.ui.addressesLabel")}
                      description={t("reports.ui.addressesDescription")}
                      checked={sections.has("addresses")}
                      onChange={(v) => toggleSection("addresses", v)}
                    />

                    <SectionToggle
                      id="services"
                      label={t("reports.ui.servicesLabel")}
                      description={t("reports.ui.servicesDescription")}
                      checked={sections.has("services")}
                      onChange={(v) => toggleSection("services", v)}
                    />

                    <SectionToggle
                      id="accommodations"
                      label={t("reports.ui.accommodationsLabel")}
                      description={t("reports.ui.accommodationsDescription")}
                      checked={sections.has("accommodations")}
                      onChange={(v) => toggleSection("accommodations", v)}
                    />

                    <SectionToggle
                      id="observations"
                      label={t("reports.ui.observationsLabel")}
                      description={t("reports.ui.observationsDescription")}
                      checked={sections.has("observations")}
                      onChange={(v) => toggleSection("observations", v)}
                    />

                    <SectionToggle
                      id="notes"
                      label={t("reports.ui.notesLabel")}
                      description={t("reports.ui.notesDescription")}
                      checked={sections.has("notes")}
                      onChange={(v) => toggleSection("notes", v)}
                    >
                      {sections.has("notes") && (
                        <div className="mt-2 flex flex-col gap-1.5">
                          <span className="text-xs text-foreground/50">{t("reports.ui.tagFilter")}</span>
                          <Select
                            aria-label="Tag filter"
                            selectedKey={noteTagFilter || "__all__"}
                            onSelectionChange={(k) => setNoteTagFilter(k === "__all__" ? "" : String(k))}
                            className="w-full"
                          >
                            <Select.Trigger>
                              <Select.Value />
                              <Select.Indicator />
                            </Select.Trigger>
                            <Select.Popover>
                              <ListBox>
                                <ListBox.Item id="__all__" textValue={t("reports.ui.allTags")}>{t("reports.ui.allTags")}</ListBox.Item>
                                {NOTE_TAG_KEYS.map((tagKey) => (
                                  <ListBox.Item key={tagKey} id={tagKey} textValue={tagKey}>
                                    {tagKey.charAt(0).toUpperCase() + tagKey.slice(1)}
                                  </ListBox.Item>
                                ))}
                              </ListBox>
                            </Select.Popover>
                          </Select>
                        </div>
                      )}
                    </SectionToggle>

                    <SectionToggle
                      id="student-attendance-summary"
                      label={t("reports.ui.studentAttendanceSummaryLabel")}
                      description={t("reports.ui.studentAttendanceSummaryDescription")}
                      checked={sections.has("student-attendance-summary")}
                      onChange={(v) => toggleSection("student-attendance-summary", v)}
                    >
                      {sections.has("student-attendance-summary") && (
                        <div className="mt-2 flex flex-col gap-1.5">
                          <span className="text-xs text-foreground/50">{t("reports.ui.dateRange")}</span>
                          <div className="flex flex-col gap-2">
                            <ReportDatePicker
                              label={t("reports.ui.dateFrom")}
                              value={studentSummaryDateFrom}
                              onChange={setStudentSummaryDateFrom}
                            />
                            <ReportDatePicker
                              label={t("reports.ui.dateTo")}
                              value={studentSummaryDateTo}
                              onChange={setStudentSummaryDateTo}
                            />
                          </div>
                        </div>
                      )}
                    </SectionToggle>

                    <SectionToggle
                      id="student-attendance"
                      label={t("reports.ui.attendanceRecordsLabel")}
                      description={t("reports.ui.attendanceRecordsDescription")}
                      checked={sections.has("student-attendance")}
                      onChange={(v) => toggleSection("student-attendance", v)}
                    >
                      {sections.has("student-attendance") && (
                        <div className="mt-2 flex flex-col gap-2">
                          <div className="flex flex-col gap-1.5">
                            <span className="text-xs text-foreground/50">{t("reports.ui.dateRange")}</span>
                            <div className="flex flex-col gap-2">
                              <ReportDatePicker
                                label={t("reports.ui.dateFrom")}
                                value={studentDateFrom}
                                onChange={setStudentDateFrom}
                              />
                              <ReportDatePicker
                                label={t("reports.ui.dateTo")}
                                value={studentDateTo}
                                onChange={setStudentDateTo}
                              />
                            </div>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <span className="text-xs text-foreground/50">{t("reports.ui.attendanceRecordsStatusFilter")}</span>
                            <div className="flex flex-wrap gap-1.5">
                              {(["present", "absent", "late", "early_pickup"] as const).map((status) => {
                                const label = {
                                  present: t("reports.pdf.statusPresent"),
                                  absent: t("reports.pdf.statusAbsent"),
                                  late: t("reports.pdf.statusLate"),
                                  early_pickup: t("reports.pdf.colPartial"),
                                }[status];
                                const active = studentAttendanceStatuses.has(status);
                                return (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() => {
                                      setStudentAttendanceStatuses((prev) => {
                                        const next = new Set(prev);
                                        next.has(status) ? next.delete(status) : next.add(status);
                                        return next;
                                      });
                                    }}
                                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                                      active
                                        ? "bg-accent/15 text-accent border-accent/40"
                                        : "bg-transparent text-foreground/35 border-foreground/15"
                                    }`}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </SectionToggle>

                    <SectionToggle
                      id="student-grade-summary"
                      label={t("reports.ui.studentGradeSummaryLabel")}
                      description={t("reports.ui.studentGradeSummaryDescription")}
                      checked={sections.has("student-grade-summary")}
                      onChange={(v) => toggleSection("student-grade-summary", v)}
                    />

                    <SectionToggle
                      id="student-grades"
                      label={t("reports.ui.gradesLabel")}
                      description={t("reports.ui.gradesDescription")}
                      checked={sections.has("student-grades")}
                      onChange={(v) => toggleSection("student-grades", v)}
                    >
                      {sections.has("student-grades") && studentAvailablePeriods.length > 0 && (
                        <div className="mt-2 flex flex-col gap-1.5">
                          <span className="text-xs text-foreground/50">{t("reports.ui.period")}</span>
                          <Select
                            aria-label="Period filter"
                            selectedKey={studentGradesPeriod || "__all__"}
                            onSelectionChange={(k) =>
                              setStudentGradesPeriod(k === "__all__" ? "" : String(k))
                            }
                            className="w-full"
                          >
                            <Select.Trigger>
                              <Select.Value />
                              <Select.Indicator />
                            </Select.Trigger>
                            <Select.Popover>
                              <ListBox>
                                <ListBox.Item id="__all__" textValue={t("reports.ui.allPeriods")}>{t("reports.ui.allPeriods")}</ListBox.Item>
                                {studentAvailablePeriods.map((p) => (
                                  <ListBox.Item key={p} id={p} textValue={p}>{p}</ListBox.Item>
                                ))}
                              </ListBox>
                            </Select.Popover>
                          </Select>
                        </div>
                      )}
                    </SectionToggle>
                  </>
                )}
              </>
            )}

            {/* Generate button */}
            <div className="flex flex-col gap-2 pt-1">
              <Button
                variant="primary"
                fullWidth
                isDisabled={!canGenerate}
                onPress={handleGenerate}
              >
                {generating ? t("reports.ui.saving") : t("reports.ui.saveToFolder")}
              </Button>
              {sections.size === 0 && (scope === "group" || selectedStudentId !== null) && (
                <p className="text-xs text-center text-foreground/30">
                  {t("reports.ui.selectAtLeastOne")}
                </p>
              )}
              {scope === "individual" && selectedStudentId === null && (
                <p className="text-xs text-center text-foreground/30">
                  {t("reports.ui.selectStudentFirst")}
                </p>
              )}
            </div>

            {result && (
              <Surface
                className={`flex items-start gap-2 px-3 py-2.5 rounded-lg text-sm ${
                  result.ok ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5"
                }`}
              >
                {result.ok ? (
                  <CheckCircle size={14} className="text-success mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle size={14} className="text-danger mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="break-all text-xs leading-relaxed">{result.message}</p>
                  {result.ok && result.filePath && (
                    <button
                      className="flex items-center gap-1 mt-1.5 text-xs text-foreground/50 hover:text-foreground/80 transition-colors"
                      onClick={() => revealItemInDir(result.filePath!)}
                    >
                      <FolderOpen size={11} />
                      {t("reports.ui.showInFinder")}
                    </button>
                  )}
                </div>
              </Surface>
            )}
          </div>
        </div>

        {/* Right: live preview */}
        <div className="flex-1 flex flex-col min-w-0 bg-foreground/[0.03]">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background shrink-0">
            <span className="text-xs font-medium text-foreground/40 uppercase tracking-wide">
              {t("reports.ui.preview")}
            </span>
            {previewLoading && (
              <span className="flex items-center gap-1.5 text-xs text-foreground/40">
                <span className="w-3 h-3 border border-foreground/20 border-t-foreground/60 rounded-full animate-spin" />
                {t("reports.ui.previewUpdating")}
              </span>
            )}
          </div>

          <div className="flex-1 relative">
            {previewUrl && (
              <iframe
                src={previewUrl}
                className="absolute inset-0 w-full h-full border-0"
                title="PDF Preview"
              />
            )}

            {stagedPreviewUrl && (
              <iframe
                src={stagedPreviewUrl}
                className="absolute inset-0 w-full h-full border-0 opacity-0 pointer-events-none"
                title="PDF Preview Loading"
                onLoad={handleStagedPreviewLoad}
              />
            )}

            {!previewUrl && !stagedPreviewUrl && !previewLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-foreground/20">
                <FileText size={48} strokeWidth={1} />
                <p className="text-sm">
                  {scope === "individual" && !selectedStudentId
                    ? t("reports.ui.previewSelectStudent")
                    : t("reports.ui.previewEmpty")}
                </p>
              </div>
            )}

            {previewLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/35 text-foreground/30 backdrop-blur-[1px]">
                <span className="w-8 h-8 border-2 border-foreground/10 border-t-foreground/40 rounded-full animate-spin" />
                <p className="text-sm">{previewUrl ? t("reports.ui.previewRefreshing") : t("reports.ui.previewBuilding")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface SectionToggleProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children?: React.ReactNode;
}

function SectionToggle({ id, label, description, checked, onChange, children }: SectionToggleProps) {
  return (
    <Surface
      className={`px-4 py-3 rounded-lg transition-all ${
        checked ? "ring-1 ring-accent/40" : "opacity-80"
      }`}
    >
      <div className="flex items-start gap-3">
        <label htmlFor={id} className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer">
          <input
            id={id}
            type="checkbox"
            className="mt-0.5 accent-[var(--color-accent)]"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-foreground/50 mt-0.5">{description}</p>
          </div>
        </label>
      </div>
      {children ? <div className="mt-2 ml-6">{children}</div> : null}
    </Surface>
  );
}
