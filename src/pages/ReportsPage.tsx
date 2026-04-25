import { useState, useEffect, useRef } from "react";
import { Button, Surface, Select, ListBox, DatePicker, DateField, Calendar, Label } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import type { DateValue } from "@internationalized/date";
import { FileText, FolderOpen, CheckCircle, AlertCircle } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { invoke } from "@tauri-apps/api/core";
import { join } from "@tauri-apps/api/path";
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
import { GradesSection } from "../reports/sections/GradesSection";
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
  fetchStudentAttendanceRecords,
  fetchStudentGrades,
  fetchStudentDistinctPeriods,
} from "../reports/fetchStudentReportData";
import type { Group } from "../types/group";
import type { Student } from "../types/student";
import { NOTE_TAG_KEYS } from "../types/note";

const REPORTS_FOLDER_KEY = "tizara-reports-folder";
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
  | "student-attendance"
  | "student-grades";
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
  const folder = localStorage.getItem(REPORTS_FOLDER_KEY);

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
  const [studentGradesPeriod, setStudentGradesPeriod] = useState("");
  const [studentAvailablePeriods, setStudentAvailablePeriods] = useState<string[]>([]);

  // UI state
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
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
              title="Group Report"
              groupName={group.name}
              schoolName={group.school_name}
              generatedDate={new Date().toLocaleDateString()}
            >
              {students ? <StudentRosterSection students={students} /> : null}
              {attendanceRows ? (
                <AttendanceSummarySection
                  rows={attendanceRows}
                  dateFrom={dateFrom || undefined}
                  dateTo={dateTo || undefined}
                />
              ) : null}
              {gradeData ? (
                <GradeSummarySection assignments={gradeData} periodFilter={gradesPeriod || undefined} />
              ) : null}
            </PdfDocument>
          );
        } else {
          const sid = selectedStudentId!;
          const [student, contacts, addresses, services, accommodations, observations, notes, attendanceRecords, grades] =
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
              sections.has("student-attendance")
                ? fetchStudentAttendanceRecords(sid, studentDateFrom || undefined, studentDateTo || undefined)
                : Promise.resolve(null),
              sections.has("student-grades")
                ? fetchStudentGrades(sid, studentGradesPeriod || undefined)
                : Promise.resolve(null),
            ]);
          if (cancelled) return;
          doc = (
            <PdfDocument
              title={`${student?.name ?? "Student"} — Student Report`}
              groupName={group.name}
              schoolName={group.school_name}
              generatedDate={new Date().toLocaleDateString()}
            >
              {sections.has("profile") && student ? <StudentProfileSection student={student} /> : null}
              {contacts ? <ContactsSection contacts={contacts} /> : null}
              {addresses ? <AddressesSection addresses={addresses} /> : null}
              {services !== null && sections.has("services") ? <ServicesSection services={services} /> : null}
              {accommodations !== null && sections.has("accommodations") ? (
                <AccommodationsSection accommodations={accommodations} />
              ) : null}
              {observations !== null && sections.has("observations") ? (
                <ObservationsSection observations={observations} />
              ) : null}
              {notes ? <NotesSection notes={notes} tagFilter={noteTagFilter || undefined} /> : null}
              {attendanceRecords ? (
                <AttendanceRecordsSection
                  records={attendanceRecords}
                  dateFrom={studentDateFrom || undefined}
                  dateTo={studentDateTo || undefined}
                />
              ) : null}
              {grades ? <GradesSection grades={grades} periodFilter={studentGradesPeriod || undefined} /> : null}
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
    noteTagFilter, studentDateFrom, studentDateTo, studentGradesPeriod,
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
    if (!folder || sections.size === 0) return;
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
            title="Group Report"
            groupName={group.name}
            schoolName={group.school_name}
            generatedDate={new Date().toLocaleDateString()}
          >
            {students ? <StudentRosterSection students={students} /> : null}
            {attendanceRows ? (
              <AttendanceSummarySection
                rows={attendanceRows}
                dateFrom={dateFrom || undefined}
                dateTo={dateTo || undefined}
              />
            ) : null}
            {gradeData ? (
              <GradeSummarySection assignments={gradeData} periodFilter={gradesPeriod || undefined} />
            ) : null}
          </PdfDocument>
        );
        const safeName = group.name.replace(/[^a-z0-9]/gi, "-").toLowerCase();
        const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        filename = `tizara-group-${safeName}-${ts}.pdf`;
      } else {
        const [student, contacts, addresses, services, accommodations, observations, notes, attendanceRecords, grades] =
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
            sections.has("student-attendance")
              ? fetchStudentAttendanceRecords(sid!, studentDateFrom || undefined, studentDateTo || undefined)
              : Promise.resolve(null),
            sections.has("student-grades")
              ? fetchStudentGrades(sid!, studentGradesPeriod || undefined)
              : Promise.resolve(null),
          ]);
        doc = (
          <PdfDocument
            title={`${student?.name ?? "Student"} — Student Report`}
            groupName={group.name}
            schoolName={group.school_name}
            generatedDate={new Date().toLocaleDateString()}
          >
            {sections.has("profile") && student ? <StudentProfileSection student={student} /> : null}
            {contacts ? <ContactsSection contacts={contacts} /> : null}
            {addresses ? <AddressesSection addresses={addresses} /> : null}
            {services !== null && sections.has("services") ? <ServicesSection services={services} /> : null}
            {accommodations !== null && sections.has("accommodations") ? (
              <AccommodationsSection accommodations={accommodations} />
            ) : null}
            {observations !== null && sections.has("observations") ? (
              <ObservationsSection observations={observations} />
            ) : null}
            {notes ? <NotesSection notes={notes} tagFilter={noteTagFilter || undefined} /> : null}
            {attendanceRecords ? (
              <AttendanceRecordsSection
                records={attendanceRecords}
                dateFrom={studentDateFrom || undefined}
                dateTo={studentDateTo || undefined}
              />
            ) : null}
            {grades ? <GradesSection grades={grades} periodFilter={studentGradesPeriod || undefined} /> : null}
          </PdfDocument>
        );
        const safeName = (student?.name ?? "student").replace(/[^a-z0-9]/gi, "-").toLowerCase();
        const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        filename = `tizara-student-${safeName}-${ts}.pdf`;
      }

      const blob = await pdf(doc).toBlob();
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const base64 = btoa(Array.from(bytes).map((b) => String.fromCharCode(b)).join(""));
      const filePath = await join(folder, filename);
      await invoke("write_pdf", { path: filePath, dataBase64: base64 });
      setResult({ ok: true, message: `Saved to ${filePath}` });
    } catch (err) {
      setResult({ ok: false, message: String(err) });
    } finally {
      setGenerating(false);
    }
  }

  const canGenerate =
    !!folder &&
    sections.size > 0 &&
    !generating &&
    (scope === "group" || selectedStudentId !== null);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border shrink-0">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText size={22} />
          Reports
        </h2>
        <p className="text-sm text-muted mt-0.5">
          Generate PDF reports for your group or individual students.
        </p>
        {!folder && (
          <div className="flex items-start gap-2 mt-3 text-sm text-foreground/60">
            <FolderOpen size={14} className="text-warning mt-0.5 shrink-0" />
            <span>
              No output folder set. Go to <strong>Settings → Files</strong> to configure one before saving.
            </span>
          </div>
        )}
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
                  {s === "group" ? "Group Report" : "Student Report"}
                </button>
              ))}
            </div>

            {/* Group scope */}
            {scope === "group" && (
              <>
                <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wide">
                  Sections
                </p>

                <SectionToggle
                  id="roster"
                  label="Student Roster"
                  description="All enrolled students with basic information."
                  checked={sections.has("roster")}
                  onChange={(v) => toggleSection("roster", v)}
                />

                <SectionToggle
                  id="attendance"
                  label="Attendance Summary"
                  description="Per-student attendance counts across the group."
                  checked={sections.has("attendance")}
                  onChange={(v) => toggleSection("attendance", v)}
                >
                  {sections.has("attendance") && (
                    <div className="mt-2 flex flex-col gap-1.5">
                      <span className="text-xs text-foreground/50">Date range (optional)</span>
                      <div className="flex flex-col gap-2">
                        <ReportDatePicker label="From" value={dateFrom} onChange={setDateFrom} />
                        <ReportDatePicker label="To" value={dateTo} onChange={setDateTo} />
                      </div>
                    </div>
                  )}
                </SectionToggle>

                <SectionToggle
                  id="grades"
                  label="Grade Summary"
                  description="Assignment scores for every student."
                  checked={sections.has("grades")}
                  onChange={(v) => toggleSection("grades", v)}
                >
                  {sections.has("grades") && availablePeriods.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1.5">
                      <span className="text-xs text-foreground/50">Period (optional)</span>
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
                            <ListBox.Item id="__all__" textValue="All periods">All periods</ListBox.Item>
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
                    Student
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
                      Sections
                    </p>

                    <SectionToggle
                      id="profile"
                      label="Student Profile"
                      description="Name, gender, date of birth, and enrollment dates."
                      checked={sections.has("profile")}
                      onChange={(v) => toggleSection("profile", v)}
                    />

                    <SectionToggle
                      id="contacts"
                      label="Family Contacts"
                      description="Contacts with relationship, phone, email, and roles."
                      checked={sections.has("contacts")}
                      onChange={(v) => toggleSection("contacts", v)}
                    />

                    <SectionToggle
                      id="addresses"
                      label="Addresses"
                      description="All recorded addresses, home address highlighted."
                      checked={sections.has("addresses")}
                      onChange={(v) => toggleSection("addresses", v)}
                    />

                    <SectionToggle
                      id="services"
                      label="Services & Support"
                      description="Special ed, therapies, medical plan, allergies, and conditions."
                      checked={sections.has("services")}
                      onChange={(v) => toggleSection("services", v)}
                    />

                    <SectionToggle
                      id="accommodations"
                      label="Accommodations"
                      description="Checklist of classroom accommodations."
                      checked={sections.has("accommodations")}
                      onChange={(v) => toggleSection("accommodations", v)}
                    />

                    <SectionToggle
                      id="observations"
                      label="Behavioral Observations"
                      description="Three grouped checklists: learning, attention, and social."
                      checked={sections.has("observations")}
                      onChange={(v) => toggleSection("observations", v)}
                    />

                    <SectionToggle
                      id="notes"
                      label="Notes"
                      description="Chronological student notes with tags."
                      checked={sections.has("notes")}
                      onChange={(v) => toggleSection("notes", v)}
                    >
                      {sections.has("notes") && (
                        <div className="mt-2 flex flex-col gap-1.5">
                          <span className="text-xs text-foreground/50">Tag filter (optional)</span>
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
                                <ListBox.Item id="__all__" textValue="All tags">All tags</ListBox.Item>
                                {NOTE_TAG_KEYS.map((t) => (
                                  <ListBox.Item key={t} id={t} textValue={t}>
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                  </ListBox.Item>
                                ))}
                              </ListBox>
                            </Select.Popover>
                          </Select>
                        </div>
                      )}
                    </SectionToggle>

                    <SectionToggle
                      id="student-attendance"
                      label="Attendance Records"
                      description="Per-period attendance log with status and notes."
                      checked={sections.has("student-attendance")}
                      onChange={(v) => toggleSection("student-attendance", v)}
                    >
                      {sections.has("student-attendance") && (
                        <div className="mt-2 flex flex-col gap-1.5">
                          <span className="text-xs text-foreground/50">Date range (optional)</span>
                          <div className="flex flex-col gap-2">
                            <ReportDatePicker
                              label="From"
                              value={studentDateFrom}
                              onChange={setStudentDateFrom}
                            />
                            <ReportDatePicker
                              label="To"
                              value={studentDateTo}
                              onChange={setStudentDateTo}
                            />
                          </div>
                        </div>
                      )}
                    </SectionToggle>

                    <SectionToggle
                      id="student-grades"
                      label="Grades"
                      description="Assignment scores with grade letters."
                      checked={sections.has("student-grades")}
                      onChange={(v) => toggleSection("student-grades", v)}
                    >
                      {sections.has("student-grades") && studentAvailablePeriods.length > 0 && (
                        <div className="mt-2 flex flex-col gap-1.5">
                          <span className="text-xs text-foreground/50">Period (optional)</span>
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
                                <ListBox.Item id="__all__" textValue="All periods">All periods</ListBox.Item>
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
                {generating ? "Saving…" : "Save to Folder"}
              </Button>
              {sections.size === 0 && (scope === "group" || selectedStudentId !== null) && (
                <p className="text-xs text-center text-foreground/30">
                  Select at least one section.
                </p>
              )}
              {scope === "individual" && selectedStudentId === null && (
                <p className="text-xs text-center text-foreground/30">
                  Select a student to continue.
                </p>
              )}
              {!folder && sections.size > 0 && (
                <p className="text-xs text-center text-foreground/30">
                  Configure output folder in Settings.
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
                <p className="break-all text-xs leading-relaxed">{result.message}</p>
              </Surface>
            )}
          </div>
        </div>

        {/* Right: live preview */}
        <div className="flex-1 flex flex-col min-w-0 bg-foreground/[0.03]">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background shrink-0">
            <span className="text-xs font-medium text-foreground/40 uppercase tracking-wide">
              Preview
            </span>
            {previewLoading && (
              <span className="flex items-center gap-1.5 text-xs text-foreground/40">
                <span className="w-3 h-3 border border-foreground/20 border-t-foreground/60 rounded-full animate-spin" />
                Updating…
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
                    ? "Select a student to get started"
                    : "Select sections to see a preview"}
                </p>
              </div>
            )}

            {previewLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/35 text-foreground/30 backdrop-blur-[1px]">
                <span className="w-8 h-8 border-2 border-foreground/10 border-t-foreground/40 rounded-full animate-spin" />
                <p className="text-sm">{previewUrl ? "Updating preview…" : "Building preview…"}</p>
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
