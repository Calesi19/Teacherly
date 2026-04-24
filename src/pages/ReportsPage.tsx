import { useState, useEffect } from "react";
import { Button, Surface, Select, ListBox } from "@heroui/react";
import { FileText, FolderOpen, CheckCircle, AlertCircle } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { invoke } from "@tauri-apps/api/core";
import { join } from "@tauri-apps/api/path";
import { PdfDocument } from "../reports/PdfDocument";
import { StudentRosterSection } from "../reports/sections/StudentRosterSection";
import { AttendanceSummarySection } from "../reports/sections/AttendanceSummarySection";
import { GradeSummarySection } from "../reports/sections/GradeSummarySection";
import {
  fetchStudentsForReport,
  fetchAttendanceSummary,
  fetchGradeSummary,
  fetchDistinctPeriods,
} from "../reports/fetchGroupReportData";
import type { Group } from "../types/group";

const REPORTS_FOLDER_KEY = "tizara-reports-folder";

type SectionId = "roster" | "attendance" | "grades";

interface ReportsPageProps {
  group: Group;
}

export function ReportsPage({ group }: ReportsPageProps) {
  const folder = localStorage.getItem(REPORTS_FOLDER_KEY);

  const [sections, setSections] = useState<Set<SectionId>>(new Set());
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [gradesPeriod, setGradesPeriod] = useState("");
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    setResult(null);
    fetchDistinctPeriods(group.id).then(setAvailablePeriods).catch(() => {});
  }, [group.id]);

  function toggleSection(id: SectionId, on: boolean) {
    setSections((prev) => {
      const next = new Set(prev);
      on ? next.add(id) : next.delete(id);
      return next;
    });
  }

  async function handleGenerate() {
    if (!folder || sections.size === 0) return;
    setGenerating(true);
    setResult(null);

    try {
      const [students, attendanceRows, gradeData] = await Promise.all([
        sections.has("roster") ? fetchStudentsForReport(group.id) : Promise.resolve(null),
        sections.has("attendance")
          ? fetchAttendanceSummary(group.id, dateFrom || undefined, dateTo || undefined)
          : Promise.resolve(null),
        sections.has("grades")
          ? fetchGradeSummary(group.id, gradesPeriod || undefined)
          : Promise.resolve(null),
      ]);

      const doc = (
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
            <GradeSummarySection
              assignments={gradeData}
              periodFilter={gradesPeriod || undefined}
            />
          ) : null}
        </PdfDocument>
      );

      const blob = await pdf(doc).toBlob();
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const base64 = btoa(Array.from(bytes).map((b) => String.fromCharCode(b)).join(""));

      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const safeName = group.name.replace(/[^a-z0-9]/gi, "-").toLowerCase();
      const filename = `tizara-report-${safeName}-${ts}.pdf`;
      const filePath = await join(folder, filename);

      await invoke("write_pdf", { path: filePath, dataBase64: base64 });
      setResult({ ok: true, message: `Saved to ${filePath}` });
    } catch (err) {
      setResult({ ok: false, message: String(err) });
    } finally {
      setGenerating(false);
    }
  }

  const canGenerate = !!folder && sections.size > 0 && !generating;

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText size={22} />
          Reports
        </h2>
        <p className="text-sm text-muted mt-0.5">
          Generate PDF reports for your group or individual students.
        </p>
      </div>

      {!folder && (
        <Surface className="flex items-start gap-3 px-4 py-3 rounded-lg mb-4">
          <FolderOpen size={16} className="text-warning mt-0.5 shrink-0" />
          <p className="text-sm text-foreground/70">
            No output folder configured. Go to{" "}
            <strong>Settings → Files</strong> to choose where PDFs will be saved.
          </p>
        </Surface>
      )}

      <div className="flex flex-col gap-6 max-w-2xl">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wide">
            Group Report
          </p>

          <SectionToggle
            id="roster"
            label="Student Roster"
            description="A list of all enrolled students with their basic information."
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
              <div className="flex items-center gap-3 mt-2">
                <label className="text-xs text-foreground/60 shrink-0">Date range</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="text-xs border border-border rounded px-2 py-1 bg-background text-foreground"
                />
                <span className="text-xs text-foreground/40">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="text-xs border border-border rounded px-2 py-1 bg-background text-foreground"
                />
              </div>
            )}
          </SectionToggle>

          <SectionToggle
            id="grades"
            label="Grade Summary"
            description="Assignment scores for every student, grouped by assignment."
            checked={sections.has("grades")}
            onChange={(v) => toggleSection("grades", v)}
          >
            {sections.has("grades") && availablePeriods.length > 0 && (
              <div className="flex items-center gap-3 mt-2">
                <label className="text-xs text-foreground/60 shrink-0">Period</label>
                <Select
                  aria-label="Period filter"
                  selectedKey={gradesPeriod || "__all__"}
                  onSelectionChange={(k) => setGradesPeriod(k === "__all__" ? "" : String(k))}
                  className="w-48"
                >
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item id="__all__" textValue="All periods">
                        All periods
                      </ListBox.Item>
                      {availablePeriods.map((p) => (
                        <ListBox.Item key={p} id={p} textValue={p}>
                          {p}
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>
            )}
          </SectionToggle>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            isDisabled={!canGenerate}
            onPress={handleGenerate}
          >
            {generating ? "Generating…" : "Generate Report"}
          </Button>
          {sections.size === 0 && (
            <span className="text-xs text-foreground/40">Select at least one section above.</span>
          )}
        </div>

        {result && (
          <Surface
            className={`flex items-start gap-3 px-4 py-3 rounded-lg ${
              result.ok ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5"
            }`}
          >
            {result.ok ? (
              <CheckCircle size={16} className="text-success mt-0.5 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-danger mt-0.5 shrink-0" />
            )}
            <p className="text-sm break-all">{result.message}</p>
          </Surface>
        )}
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
      className={`px-4 py-3 rounded-lg transition-colors ${
        checked ? "ring-1 ring-accent/30" : ""
      }`}
    >
      <label htmlFor={id} className="flex items-start gap-3 cursor-pointer">
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
          {children}
        </div>
      </label>
    </Surface>
  );
}
