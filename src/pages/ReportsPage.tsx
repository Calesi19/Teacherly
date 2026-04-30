import { useState, useEffect, useRef } from "react";
import { useTranslation } from "../i18n/LanguageContext";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AppDatePicker } from "@/components/ui/app-date-picker";
import { cn } from "@/lib/utils";
import { FileText, FolderOpen, CheckCircle, AlertCircle } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { invoke } from "@tauri-apps/api/core";
import { PdfDocument } from "../reports/PdfDocument";
import { getReportLocale } from "../reports/formatters";
import { StudentRosterSection } from "../reports/sections/StudentRosterSection";
import { AttendanceSummarySection } from "../reports/sections/AttendanceSummarySection";
import { GradeSummarySection } from "../reports/sections/GradeSummarySection";
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
import {
  fetchStudentsForReport,
  fetchAttendanceSummary,
  fetchGradeSummary,
  fetchDistinctPeriods,
} from "../reports/fetchGroupReportData";
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

function ReportsDateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <AppDatePicker
      label={label}
      value={value}
      onChange={onChange}
      placeholder={label}
      className="min-w-0 flex-1"
    />
  );
}

function getGeneratedReportDate(language: "en" | "es") {
  return new Intl.DateTimeFormat(getReportLocale(language), {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

export function ReportsPage({ group }: ReportsPageProps) {
  const { t, language } = useTranslation();

  const [scope, setScope] = useState<Scope>("group");
  const [groupStudents, setGroupStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    null,
  );
  const [sections, setSections] = useState<Set<SectionId>>(new Set());

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [gradesPeriod, setGradesPeriod] = useState("");
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);

  const [noteTagFilter, setNoteTagFilter] = useState("");
  const [studentDateFrom, setStudentDateFrom] = useState("");
  const [studentDateTo, setStudentDateTo] = useState("");
  const [studentAttendanceStatuses, setStudentAttendanceStatuses] = useState<
    Set<string>
  >(new Set(["present", "absent", "late", "early_pickup"]));
  const [studentSummaryDateFrom, setStudentSummaryDateFrom] = useState(
    () => group.start_date ?? "",
  );
  const [studentSummaryDateTo, setStudentSummaryDateTo] = useState(() => {
    const today = new Date().toISOString().slice(0, 10);
    return group.end_date && today > group.end_date ? group.end_date : today;
  });
  const [studentGradesPeriod, setStudentGradesPeriod] = useState("");
  const [studentAvailablePeriods, setStudentAvailablePeriods] = useState<
    string[]
  >([]);

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
    filePath?: string;
  } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stagedPreviewUrl, setStagedPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewUrlsRef = useRef<Set<string>>(new Set());
  const previewUrlRef = useRef<string | null>(null);
  const stagedPreviewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    fetchStudentsForReport(group.id)
      .then(setGroupStudents)
      .catch(() => {});
    fetchDistinctPeriods(group.id)
      .then(setAvailablePeriods)
      .catch(() => {});
    setResult(null);
    setStudentSummaryDateFrom(group.start_date ?? "");
    const today = new Date().toISOString().slice(0, 10);
    setStudentSummaryDateTo(
      group.end_date && today > group.end_date ? group.end_date : today,
    );
  }, [group.id, group.end_date, group.start_date]);

  useEffect(() => {
    if (selectedStudentId !== null) {
      fetchStudentDistinctPeriods(selectedStudentId)
        .then(setStudentAvailablePeriods)
        .catch(() => {});
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

  useEffect(() => {
    return () => {
      for (const url of previewUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      previewUrlsRef.current.clear();
    };
  }, []);

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
            sections.has("roster")
              ? fetchStudentsForReport(group.id)
              : Promise.resolve(null),
            sections.has("attendance")
              ? fetchAttendanceSummary(
                  group.id,
                  dateFrom || undefined,
                  dateTo || undefined,
                )
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
              generatedDate={getGeneratedReportDate(language)}
              language={language}
            >
              {students ? (
                <StudentRosterSection students={students} language={language} />
              ) : null}
              {attendanceRows ? (
                <AttendanceSummarySection
                  rows={attendanceRows}
                  dateFrom={dateFrom || undefined}
                  dateTo={dateTo || undefined}
                  language={language}
                />
              ) : null}
              {gradeData ? (
                <GradeSummarySection
                  assignments={gradeData}
                  periodFilter={gradesPeriod || undefined}
                  language={language}
                />
              ) : null}
            </PdfDocument>
          );
        } else {
          const sid = selectedStudentId!;
          const [
            student,
            contacts,
            addresses,
            services,
            accommodations,
            observations,
            notes,
            attendanceSummary,
            attendanceRecords,
            grades,
            courseSummary,
          ] = await Promise.all([
            fetchStudentProfile(sid),
            sections.has("contacts")
              ? fetchStudentContacts(sid)
              : Promise.resolve(null),
            sections.has("addresses")
              ? fetchStudentAddresses(sid)
              : Promise.resolve(null),
            sections.has("services")
              ? fetchStudentServices(sid)
              : Promise.resolve(null),
            sections.has("accommodations")
              ? fetchStudentAccommodations(sid)
              : Promise.resolve(null),
            sections.has("observations")
              ? fetchStudentObservations(sid)
              : Promise.resolve(null),
            sections.has("notes")
              ? fetchStudentNotes(sid, noteTagFilter || undefined)
              : Promise.resolve(null),
            sections.has("student-attendance-summary")
              ? fetchStudentAttendanceSummary(
                  sid,
                  studentSummaryDateFrom || undefined,
                  studentSummaryDateTo || undefined,
                )
              : Promise.resolve(null),
            sections.has("student-attendance")
              ? fetchStudentAttendanceRecords(
                  sid,
                  studentDateFrom || undefined,
                  studentDateTo || undefined,
                )
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
            ? attendanceRecords.filter((record) =>
                studentAttendanceStatuses.has(record.status),
              )
            : null;

          doc = (
            <PdfDocument
              title={`${student?.name ?? t("reports.pdf.studentFallback")} — ${t("reports.pdf.studentReport")}`}
              groupName={group.name}
              schoolName={group.school_name}
              generatedDate={getGeneratedReportDate(language)}
              language={language}
            >
              {sections.has("profile") && student ? (
                <StudentProfileSection student={student} language={language} />
              ) : null}
              {contacts ? (
                <ContactsSection contacts={contacts} language={language} />
              ) : null}
              {addresses ? (
                <AddressesSection addresses={addresses} language={language} />
              ) : null}
              {services !== null && sections.has("services") ? (
                <ServicesSection services={services} language={language} />
              ) : null}
              {accommodations !== null && sections.has("accommodations") ? (
                <AccommodationsSection
                  accommodations={accommodations}
                  language={language}
                />
              ) : null}
              {observations !== null && sections.has("observations") ? (
                <ObservationsSection
                  observations={observations}
                  language={language}
                />
              ) : null}
              {notes ? (
                <NotesSection
                  notes={notes}
                  tagFilter={noteTagFilter || undefined}
                  language={language}
                />
              ) : null}
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
              {courseSummary ? (
                <StudentGradeSummarySection
                  courses={courseSummary}
                  language={language}
                />
              ) : null}
              {grades ? (
                <GradesSection
                  grades={grades}
                  periodFilter={studentGradesPeriod || undefined}
                  language={language}
                />
              ) : null}
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
        // silent
      } finally {
        if (!cancelled) setPreviewLoading(false);
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
    sections,
    scope,
    selectedStudentId,
    dateFrom,
    dateTo,
    gradesPeriod,
    noteTagFilter,
    studentDateFrom,
    studentDateTo,
    studentAttendanceStatuses,
    studentSummaryDateFrom,
    studentSummaryDateTo,
    studentGradesPeriod,
    group.id,
    group.name,
    group.school_name,
    language,
    t,
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
      if (on) next.add(id);
      else next.delete(id);
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
          sections.has("roster")
            ? fetchStudentsForReport(group.id)
            : Promise.resolve(null),
          sections.has("attendance")
            ? fetchAttendanceSummary(
                group.id,
                dateFrom || undefined,
                dateTo || undefined,
              )
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
            generatedDate={getGeneratedReportDate(language)}
            language={language}
          >
            {students ? (
              <StudentRosterSection students={students} language={language} />
            ) : null}
            {attendanceRows ? (
              <AttendanceSummarySection
                rows={attendanceRows}
                dateFrom={dateFrom || undefined}
                dateTo={dateTo || undefined}
                language={language}
              />
            ) : null}
            {gradeData ? (
              <GradeSummarySection
                assignments={gradeData}
                periodFilter={gradesPeriod || undefined}
                language={language}
              />
            ) : null}
          </PdfDocument>
        );
        const safeName = group.name.replace(/[^a-z0-9]/gi, "-").toLowerCase();
        const ts = new Date().toISOString().slice(0, 10);
        filename = `group-${safeName}-${ts}.pdf`;
      } else {
        const [
          student,
          contacts,
          addresses,
          services,
          accommodations,
          observations,
          notes,
          attendanceSummary,
          attendanceRecords,
          grades,
          courseSummary,
        ] = await Promise.all([
          fetchStudentProfile(sid!),
          sections.has("contacts")
            ? fetchStudentContacts(sid!)
            : Promise.resolve(null),
          sections.has("addresses")
            ? fetchStudentAddresses(sid!)
            : Promise.resolve(null),
          sections.has("services")
            ? fetchStudentServices(sid!)
            : Promise.resolve(null),
          sections.has("accommodations")
            ? fetchStudentAccommodations(sid!)
            : Promise.resolve(null),
          sections.has("observations")
            ? fetchStudentObservations(sid!)
            : Promise.resolve(null),
          sections.has("notes")
            ? fetchStudentNotes(sid!, noteTagFilter || undefined)
            : Promise.resolve(null),
          sections.has("student-attendance-summary")
            ? fetchStudentAttendanceSummary(
                sid!,
                studentSummaryDateFrom || undefined,
                studentSummaryDateTo || undefined,
              )
            : Promise.resolve(null),
          sections.has("student-attendance")
            ? fetchStudentAttendanceRecords(
                sid!,
                studentDateFrom || undefined,
                studentDateTo || undefined,
              )
            : Promise.resolve(null),
          sections.has("student-grades")
            ? fetchStudentGrades(sid!, studentGradesPeriod || undefined)
            : Promise.resolve(null),
          sections.has("student-grade-summary")
            ? fetchStudentCourseSummary(sid!)
            : Promise.resolve(null),
        ]);

        const filteredRecords = attendanceRecords
          ? attendanceRecords.filter((record) =>
              studentAttendanceStatuses.has(record.status),
            )
          : null;

        doc = (
          <PdfDocument
            title={`${student?.name ?? t("reports.pdf.studentFallback")} — ${t("reports.pdf.studentReport")}`}
            groupName={group.name}
            schoolName={group.school_name}
            generatedDate={getGeneratedReportDate(language)}
            language={language}
          >
            {sections.has("profile") && student ? (
              <StudentProfileSection student={student} language={language} />
            ) : null}
            {contacts ? (
              <ContactsSection contacts={contacts} language={language} />
            ) : null}
            {addresses ? (
              <AddressesSection addresses={addresses} language={language} />
            ) : null}
            {services !== null && sections.has("services") ? (
              <ServicesSection services={services} language={language} />
            ) : null}
            {accommodations !== null && sections.has("accommodations") ? (
              <AccommodationsSection
                accommodations={accommodations}
                language={language}
              />
            ) : null}
            {observations !== null && sections.has("observations") ? (
              <ObservationsSection
                observations={observations}
                language={language}
              />
            ) : null}
            {notes ? (
              <NotesSection
                notes={notes}
                tagFilter={noteTagFilter || undefined}
                language={language}
              />
            ) : null}
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
            {courseSummary ? (
              <StudentGradeSummarySection
                courses={courseSummary}
                language={language}
              />
            ) : null}
            {grades ? (
              <GradesSection
                grades={grades}
                periodFilter={studentGradesPeriod || undefined}
                language={language}
              />
            ) : null}
          </PdfDocument>
        );
        const safeName = (student?.name ?? "student")
          .replace(/[^a-z0-9]/gi, "-")
          .toLowerCase();
        const ts = new Date().toISOString().slice(0, 10);
        filename = `student-${safeName}-${ts}.pdf`;
      }

      const blob = await pdf(doc).toBlob();
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const base64 = btoa(
        Array.from(bytes)
          .map((b) => String.fromCharCode(b))
          .join(""),
      );

      const lastDir = localStorage.getItem(REPORTS_LAST_DIR_KEY) ?? undefined;
      const defaultPath = lastDir ? `${lastDir}/${filename}` : filename;
      const [{ save }, { dirname }] = await Promise.all([
        import("@tauri-apps/plugin-dialog"),
        import("@tauri-apps/api/path"),
      ]);
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
  const selectedStudent =
    selectedStudentId !== null
      ? (groupStudents.find((student) => student.id === selectedStudentId) ??
        null)
      : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1">
        <div className="flex w-88 shrink-0 flex-col overflow-y-auto border-r border-border pr-3">
          <div className="shrink-0 px-3 pt-8">
            <h2 className="text-2xl font-bold">{t("reports.ui.title")}</h2>
          </div>

          <div className="flex flex-col gap-4 p-3">
            <div className="flex gap-1 rounded-lg bg-foreground/5 p-1">
              {(["group", "individual"] as Scope[]).map((value) => (
                <button
                  key={value}
                  onClick={() => switchScope(value)}
                  className={cn(
                    "flex-1 rounded-md py-1.5 text-xs font-medium transition-all",
                    scope === value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-foreground/50 hover:text-foreground/70",
                  )}
                >
                  {value === "group"
                    ? t("reports.ui.scopeGroup")
                    : t("reports.ui.scopeStudent")}
                </button>
              ))}
            </div>

            {scope === "group" && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
                  {t("reports.ui.sections")}
                </p>

                <SectionToggle
                  id="roster"
                  label={t("reports.ui.rosterLabel")}
                  description={t("reports.ui.rosterDescription")}
                  checked={sections.has("roster")}
                  onChange={(value) => toggleSection("roster", value)}
                />

                <SectionToggle
                  id="attendance"
                  label={t("reports.ui.attendanceSummaryLabel")}
                  description={t("reports.ui.attendanceSummaryDescription")}
                  checked={sections.has("attendance")}
                  onChange={(value) => toggleSection("attendance", value)}
                >
                  {sections.has("attendance") && (
                    <div className="mt-2 flex flex-col gap-2">
                      <span className="text-xs text-foreground/50">
                        {t("reports.ui.dateRange")}
                      </span>
                      <ReportsDateField
                        label={t("reports.ui.dateFrom")}
                        value={dateFrom}
                        onChange={setDateFrom}
                      />
                      <ReportsDateField
                        label={t("reports.ui.dateTo")}
                        value={dateTo}
                        onChange={setDateTo}
                      />
                    </div>
                  )}
                </SectionToggle>

                <SectionToggle
                  id="grades"
                  label={t("reports.ui.gradeSummaryLabel")}
                  description={t("reports.ui.gradeSummaryDescription")}
                  checked={sections.has("grades")}
                  onChange={(value) => toggleSection("grades", value)}
                >
                  {sections.has("grades") && availablePeriods.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1.5">
                      <span className="text-xs text-foreground/50">
                        {t("reports.ui.period")}
                      </span>
                      <Select
                        value={gradesPeriod || "__all__"}
                        onValueChange={(value) =>
                          setGradesPeriod(
                            value === "__all__" ? "" : (value ?? ""),
                          )
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            {gradesPeriod || t("reports.ui.allPeriods")}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">
                            {t("reports.ui.allPeriods")}
                          </SelectItem>
                          {availablePeriods.map((period) => (
                            <SelectItem key={period} value={period}>
                              {period}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </SectionToggle>
              </>
            )}

            {scope === "individual" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
                    {t("reports.ui.student")}
                  </span>
                  <Select
                    value={
                      selectedStudentId !== null
                        ? String(selectedStudentId)
                        : "__none__"
                    }
                    onValueChange={(value) => {
                      const next = value === "__none__" ? null : Number(value);
                      setSelectedStudentId(next);
                      setSections(new Set());
                      setResult(null);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={t("reports.ui.selectStudentFirst")}
                      >
                        {selectedStudent?.name ??
                          t("reports.ui.selectStudentFirst")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        {t("reports.ui.selectStudentFirst")}
                      </SelectItem>
                      {groupStudents.map((student) => (
                        <SelectItem key={student.id} value={String(student.id)}>
                          {student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedStudentId !== null && (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
                      {t("reports.ui.sections")}
                    </p>

                    <SectionToggle
                      id="profile"
                      label={t("reports.ui.profileLabel")}
                      description={t("reports.ui.profileDescription")}
                      checked={sections.has("profile")}
                      onChange={(value) => toggleSection("profile", value)}
                    />
                    <SectionToggle
                      id="contacts"
                      label={t("reports.ui.contactsLabel")}
                      description={t("reports.ui.contactsDescription")}
                      checked={sections.has("contacts")}
                      onChange={(value) => toggleSection("contacts", value)}
                    />
                    <SectionToggle
                      id="addresses"
                      label={t("reports.ui.addressesLabel")}
                      description={t("reports.ui.addressesDescription")}
                      checked={sections.has("addresses")}
                      onChange={(value) => toggleSection("addresses", value)}
                    />
                    <SectionToggle
                      id="services"
                      label={t("reports.ui.servicesLabel")}
                      description={t("reports.ui.servicesDescription")}
                      checked={sections.has("services")}
                      onChange={(value) => toggleSection("services", value)}
                    />
                    <SectionToggle
                      id="accommodations"
                      label={t("reports.ui.accommodationsLabel")}
                      description={t("reports.ui.accommodationsDescription")}
                      checked={sections.has("accommodations")}
                      onChange={(value) =>
                        toggleSection("accommodations", value)
                      }
                    />
                    <SectionToggle
                      id="observations"
                      label={t("reports.ui.observationsLabel")}
                      description={t("reports.ui.observationsDescription")}
                      checked={sections.has("observations")}
                      onChange={(value) => toggleSection("observations", value)}
                    />

                    <SectionToggle
                      id="notes"
                      label={t("reports.ui.notesLabel")}
                      description={t("reports.ui.notesDescription")}
                      checked={sections.has("notes")}
                      onChange={(value) => toggleSection("notes", value)}
                    >
                      {sections.has("notes") && (
                        <div className="mt-2 flex flex-col gap-1.5">
                          <span className="text-xs text-foreground/50">
                            {t("reports.ui.tagFilter")}
                          </span>
                          <Select
                            value={noteTagFilter || "__all__"}
                            onValueChange={(value) =>
                              setNoteTagFilter(
                                value === "__all__" ? "" : (value ?? ""),
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue>
                                {noteTagFilter
                                  ? noteTagFilter.charAt(0).toUpperCase() +
                                    noteTagFilter.slice(1)
                                  : t("reports.ui.allTags")}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__all__">
                                {t("reports.ui.allTags")}
                              </SelectItem>
                              {NOTE_TAG_KEYS.map((tagKey) => (
                                <SelectItem key={tagKey} value={tagKey}>
                                  {tagKey.charAt(0).toUpperCase() +
                                    tagKey.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </SectionToggle>

                    <SectionToggle
                      id="student-attendance-summary"
                      label={t("reports.ui.studentAttendanceSummaryLabel")}
                      description={t(
                        "reports.ui.studentAttendanceSummaryDescription",
                      )}
                      checked={sections.has("student-attendance-summary")}
                      onChange={(value) =>
                        toggleSection("student-attendance-summary", value)
                      }
                    >
                      {sections.has("student-attendance-summary") && (
                        <div className="mt-2 flex flex-col gap-2">
                          <span className="text-xs text-foreground/50">
                            {t("reports.ui.dateRange")}
                          </span>
                          <ReportsDateField
                            label={t("reports.ui.dateFrom")}
                            value={studentSummaryDateFrom}
                            onChange={setStudentSummaryDateFrom}
                          />
                          <ReportsDateField
                            label={t("reports.ui.dateTo")}
                            value={studentSummaryDateTo}
                            onChange={setStudentSummaryDateTo}
                          />
                        </div>
                      )}
                    </SectionToggle>

                    <SectionToggle
                      id="student-attendance"
                      label={t("reports.ui.attendanceRecordsLabel")}
                      description={t("reports.ui.attendanceRecordsDescription")}
                      checked={sections.has("student-attendance")}
                      onChange={(value) =>
                        toggleSection("student-attendance", value)
                      }
                    >
                      {sections.has("student-attendance") && (
                        <div className="mt-2 flex flex-col gap-2">
                          <div className="flex flex-col gap-2">
                            <span className="text-xs text-foreground/50">
                              {t("reports.ui.dateRange")}
                            </span>
                            <ReportsDateField
                              label={t("reports.ui.dateFrom")}
                              value={studentDateFrom}
                              onChange={setStudentDateFrom}
                            />
                            <ReportsDateField
                              label={t("reports.ui.dateTo")}
                              value={studentDateTo}
                              onChange={setStudentDateTo}
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <span className="text-xs text-foreground/50">
                              {t("reports.ui.attendanceRecordsStatusFilter")}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {(
                                [
                                  "present",
                                  "absent",
                                  "late",
                                  "early_pickup",
                                ] as const
                              ).map((status) => {
                                const label = {
                                  present: t("reports.pdf.statusPresent"),
                                  absent: t("reports.pdf.statusAbsent"),
                                  late: t("reports.pdf.statusLate"),
                                  early_pickup: t("reports.pdf.colPartial"),
                                }[status];
                                const active =
                                  studentAttendanceStatuses.has(status);

                                return (
                                  <Badge
                                    key={status}
                                    variant={active ? "default" : "outline"}
                                    className={cn(
                                      "cursor-pointer transition-transform active:scale-95",
                                      active
                                        ? "border-accent/40 bg-accent/15 text-accent"
                                        : "text-foreground/35",
                                    )}
                                    onClick={() => {
                                      setStudentAttendanceStatuses((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(status))
                                          next.delete(status);
                                        else next.add(status);
                                        return next;
                                      });
                                    }}
                                  >
                                    {label}
                                  </Badge>
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
                      description={t(
                        "reports.ui.studentGradeSummaryDescription",
                      )}
                      checked={sections.has("student-grade-summary")}
                      onChange={(value) =>
                        toggleSection("student-grade-summary", value)
                      }
                    />

                    <SectionToggle
                      id="student-grades"
                      label={t("reports.ui.gradesLabel")}
                      description={t("reports.ui.gradesDescription")}
                      checked={sections.has("student-grades")}
                      onChange={(value) =>
                        toggleSection("student-grades", value)
                      }
                    >
                      {sections.has("student-grades") &&
                        studentAvailablePeriods.length > 0 && (
                          <div className="mt-2 flex flex-col gap-1.5">
                            <span className="text-xs text-foreground/50">
                              {t("reports.ui.period")}
                            </span>
                          <Select
                            value={studentGradesPeriod || "__all__"}
                            onValueChange={(value) =>
                              setStudentGradesPeriod(
                                value === "__all__" ? "" : (value ?? ""),
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue>
                                {studentGradesPeriod || t("reports.ui.allPeriods")}
                              </SelectValue>
                            </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__all__">
                                  {t("reports.ui.allPeriods")}
                                </SelectItem>
                                {studentAvailablePeriods.map((period) => (
                                  <SelectItem key={period} value={period}>
                                    {period}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                    </SectionToggle>
                  </>
                )}
              </>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <Button
                className="w-full"
                disabled={!canGenerate}
                onClick={handleGenerate}
              >
                {generating
                  ? t("reports.ui.saving")
                  : t("reports.ui.saveToFolder")}
              </Button>
              {sections.size === 0 &&
                (scope === "group" || selectedStudentId !== null) && (
                  <p className="text-center text-xs text-foreground/30">
                    {t("reports.ui.selectAtLeastOne")}
                  </p>
                )}
              {scope === "individual" && selectedStudentId === null && (
                <p className="text-center text-xs text-foreground/30">
                  {t("reports.ui.selectStudentFirst")}
                </p>
              )}
            </div>

            {result && (
              <div
                className={cn(
                  "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm",
                  result.ok
                    ? "border-success/30 bg-success/5"
                    : "border-danger/30 bg-danger/5",
                )}
              >
                {result.ok ? (
                  <CheckCircle
                    size={14}
                    className="mt-0.5 shrink-0 text-success"
                  />
                ) : (
                  <AlertCircle
                    size={14}
                    className="mt-0.5 shrink-0 text-danger"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="break-all text-xs leading-relaxed">
                    {result.message}
                  </p>
                  {result.ok && result.filePath && (
                    <button
                      className="mt-1.5 flex items-center gap-1 text-xs text-foreground/50 transition-colors hover:text-foreground/80"
                      onClick={async () => {
                        const { revealItemInDir } = await import(
                          "@tauri-apps/plugin-opener"
                        );
                        await revealItemInDir(result.filePath!);
                      }}
                    >
                      <FolderOpen size={11} />
                      {t("reports.ui.showInFinder")}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex h-dvh min-w-0 flex-1 flex-col bg-foreground/[0.03]">
          <div className="relative flex-1">
            {previewUrl && (
              <iframe
                src={previewUrl}
                className="absolute inset-0 h-full w-full border-0"
                title="PDF Preview"
              />
            )}

            {stagedPreviewUrl && (
              <iframe
                src={stagedPreviewUrl}
                className="pointer-events-none absolute inset-0 h-full w-full border-0 opacity-0"
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
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/10 border-t-foreground/40" />
                <p className="text-sm">
                  {previewUrl
                    ? t("reports.ui.previewRefreshing")
                    : t("reports.ui.previewBuilding")}
                </p>
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
  onChange: (value: boolean) => void;
  children?: React.ReactNode;
}

function SectionToggle({
  id,
  label,
  description,
  checked,
  onChange,
  children,
}: SectionToggleProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "cursor-pointer rounded-lg border bg-background px-4 py-3 transition-all",
        checked ? "ring-1 ring-accent/40" : "opacity-80",
      )}
      onClick={() => onChange(!checked)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onChange(!checked);
        }
      }}
      aria-pressed={checked}
      aria-label={label}
    >
      <div className="flex w-full items-start gap-3 text-left">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={() => undefined}
          aria-hidden="true"
          className="pointer-events-none"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-0.5 text-xs text-foreground/50">{description}</p>
        </div>
      </div>
      {children ? (
        <div
          className="mt-2 ml-7"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
