import { useState, useEffect } from "react";
import { Check, Inbox, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Breadcrumb } from "../components/Breadcrumb";
import { ConfirmModal } from "../components/ConfirmModal";
import { useAssignmentDetail } from "../hooks/useAssignmentDetail";
import { useTranslation } from "../i18n/LanguageContext";
import type { Group } from "../types/group";
import type { Assignment, GradeBand } from "../types/assignment";

interface AssignmentDetailPageProps {
  assignment: Assignment;
  group: Group;
  onGoToGroups: () => void;
  onGoToStudents: () => void;
  onGoToAssignments: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

const BAND_COLORS: Record<GradeBand, { bar: string; text: string }> = {
  A: { bar: "bg-success", text: "text-success" },
  B: { bar: "bg-accent", text: "text-accent" },
  C: { bar: "bg-warning", text: "text-warning" },
  D: { bar: "bg-warning/60", text: "text-warning" },
  F: { bar: "bg-danger", text: "text-danger" },
  N: { bar: "bg-foreground/10", text: "text-muted" },
};

interface NoteModalState {
  studentId: number;
  studentName: string;
  currentNote: string | null;
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

export function AssignmentDetailPage({
  assignment,
  group,
  onGoToGroups,
  onGoToStudents,
  onGoToAssignments,
  onDirtyChange,
}: AssignmentDetailPageProps) {
  const { scores, loading, error, upsertScore, setExempt, setLate, setNote, stats } =
    useAssignmentDetail(assignment.id, group.id, assignment.max_score);
  const { t } = useTranslation();

  const [pendingScores, setPendingScores] = useState<Map<number, string>>(new Map());
  const [pendingLate, setPendingLate] = useState<Map<number, boolean>>(new Map());
  const [pendingExempt, setPendingExempt] = useState<Map<number, boolean>>(new Map());

  const [noteModal, setNoteModal] = useState<NoteModalState | null>(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingNav, setPendingNav] = useState<(() => void) | null>(null);

  const hasChanges =
    pendingScores.size > 0 || pendingLate.size > 0 || pendingExempt.size > 0;

  useEffect(() => {
    onDirtyChange?.(hasChanges);
  }, [hasChanges, onDirtyChange]);

  function guardedNav(callback: () => void) {
    if (hasChanges) {
      setPendingNav(() => callback);
    } else {
      callback();
    }
  }

  const openNoteModal = (
    studentId: number,
    studentName: string,
    currentNote: string | null,
  ) => {
    setNoteModal({ studentId, studentName, currentNote });
    setNoteText(currentNote ?? "");
    setNoteOpen(true);
  };

  const closeNoteModal = () => {
    setNoteOpen(false);
    setNoteModal(null);
    setNoteText("");
  };

  const handleNoteSave = async () => {
    if (!noteModal) return;
    setSavingNote(true);
    try {
      await setNote(noteModal.studentId, noteText.trim() || null);
      closeNoteModal();
    } finally {
      setSavingNote(false);
    }
  };

  const getDisplayValue = (studentId: number, dbScore: number | null): string => {
    if (pendingScores.has(studentId)) return pendingScores.get(studentId) ?? "";
    return dbScore !== null ? String(dbScore) : "";
  };

  const handleChange = (studentId: number, value: string) => {
    setPendingScores((prev) => {
      const next = new Map(prev);
      next.set(studentId, value);
      return next;
    });
  };

  const handleBlur = (studentId: number, value: string) => {
    const trimmed = value.trim();
    const parsed = trimmed === "" ? null : parseFloat(trimmed);
    if (parsed !== null && Number.isNaN(parsed)) {
      setPendingScores((prev) => {
        const next = new Map(prev);
        next.delete(studentId);
        return next;
      });
    }
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const [studentId, scoreStr] of pendingScores) {
        const trimmed = scoreStr.trim();
        const score = trimmed === "" ? null : parseFloat(trimmed);
        await upsertScore(studentId, score);
      }
      for (const [studentId, late] of pendingLate) {
        await setLate(studentId, late);
      }
      for (const [studentId, exempt] of pendingExempt) {
        await setExempt(studentId, exempt);
      }
      setPendingScores(new Map());
      setPendingLate(new Map());
      setPendingExempt(new Map());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col px-6 py-6 pl-3">
      <Breadcrumb
        items={[
          { label: t("groups.breadcrumb"), onClick: () => guardedNav(onGoToGroups) },
          { label: group.name, onClick: () => guardedNav(onGoToStudents) },
          { label: t("assignments.breadcrumb"), onClick: () => guardedNav(onGoToAssignments) },
          { label: assignment.title },
        ]}
      />

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{assignment.title}</h2>
          <p className="mt-0.5 text-sm text-muted">
            {assignment.period_name} · {assignment.max_score} {t("assignmentDetail.ptsMax")}
          </p>
        </div>
        {hasChanges && (
          <Button size="sm" onClick={() => setSaveModalOpen(true)}>
            {t("common.save")}
          </Button>
        )}
      </div>

      {assignment.description && (
        <SectionCard className="mb-6 bg-muted/40">
          <p className="whitespace-pre-wrap text-sm text-foreground/80">
            {assignment.description}
          </p>
        </SectionCard>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : error ? (
        <div role="alert" className="mb-6 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <SectionCard className="mb-6 flex flex-col gap-4 bg-muted/40">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs uppercase tracking-wide text-muted">
                  {t("assignmentDetail.average")}
                </span>
                <span className="text-2xl font-bold">
                  {stats.average !== null ? stats.average.toFixed(1) : "—"}
                  <span className="ml-1 text-sm font-normal text-muted">
                    / {assignment.max_score}
                  </span>
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs uppercase tracking-wide text-muted">
                  {t("assignmentDetail.graded")}
                </span>
                <span className="text-2xl font-bold">
                  {stats.gradedCount}
                  <span className="ml-1 text-sm font-normal text-muted">
                    / {scores.length}{" "}
                    {scores.length !== 1
                      ? t("assignmentDetail.studentsSuffix")
                      : t("assignmentDetail.studentSuffix")}
                  </span>
                </span>
              </div>
            </div>

            {stats.distribution.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex h-3 overflow-hidden rounded-full">
                  {stats.distribution.map((distribution) => (
                    <div
                      key={distribution.band}
                      className={cn(BAND_COLORS[distribution.band].bar, "h-full")}
                      style={{ width: `${distribution.percentage}%` }}
                      title={`${distribution.band === "N" ? t("assignmentDetail.notScored") : distribution.band}: ${distribution.count} ${distribution.count !== 1 ? t("assignmentDetail.studentsSuffix") : t("assignmentDetail.studentSuffix")}`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  {stats.distribution.map((distribution) => (
                    <div key={distribution.band} className="flex items-center gap-1">
                      <span className={cn("text-xs font-semibold", BAND_COLORS[distribution.band].text)}>
                        {distribution.band === "N"
                          ? t("assignmentDetail.notScored")
                          : distribution.band}
                      </span>
                      <span className="text-xs text-muted">
                        {distribution.count} ({Math.round(distribution.percentage)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex h-full flex-1 flex-col overflow-hidden rounded-xl border bg-background">
              <div className="min-h-0 flex-1 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{" "}</TableHead>
                      <TableHead>{t("students.tableColumns.name")}</TableHead>
                      <TableHead>{" "}</TableHead>
                      <TableHead className="text-right">{t("assignmentDetail.scoreColumn")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scores.map((row) => {
                      const displayVal = getDisplayValue(row.student_id, row.score);
                      const isExtraCredit =
                        row.score !== null && row.score > assignment.max_score;
                      const isExempt = pendingExempt.has(row.student_id)
                        ? pendingExempt.get(row.student_id) ?? false
                        : row.exempt === 1;
                      const isLate = pendingLate.has(row.student_id)
                        ? pendingLate.get(row.student_id) ?? false
                        : Boolean(row.late);

                      return (
                        <TableRow key={row.student_id}>
                          <TableCell className="w-8">
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="p-1.5 text-foreground/40 hover:text-foreground"
                                    aria-label="Student options"
                                  />
                                }
                              >
                                <MoreHorizontal size={14} />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" sideOffset={4} className="w-52">
                                <DropdownMenuItem
                                  onClick={() => {
                                    const next = !isLate;
                                    setPendingLate((prev) => {
                                      const map = new Map(prev);
                                      map.set(row.student_id, next);
                                      return map;
                                    });
                                  }}
                                >
                                  <span className="flex w-full items-center justify-between gap-2">
                                    {isLate
                                      ? t("assignmentDetail.removeLate")
                                      : t("assignmentDetail.markAsLate")}
                                    {isLate ? (
                                      <Check size={12} className="text-warning" />
                                    ) : (
                                      <span className="w-3" />
                                    )}
                                  </span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    const next = !isExempt;
                                    setPendingExempt((prev) => {
                                      const map = new Map(prev);
                                      map.set(row.student_id, next);
                                      return map;
                                    });
                                  }}
                                >
                                  <span className="flex w-full items-center justify-between gap-2">
                                    {isExempt
                                      ? t("assignmentDetail.removeExempt")
                                      : t("assignmentDetail.markAsExempt")}
                                    {isExempt ? (
                                      <Check size={12} className="text-accent" />
                                    ) : (
                                      <span className="w-3" />
                                    )}
                                  </span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    openNoteModal(row.student_id, row.student_name, row.note)
                                  }
                                >
                                  {row.note
                                    ? t("assignmentDetail.editNote")
                                    : t("assignmentDetail.addNote")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{row.student_name}</span>
                          </TableCell>
                          <TableCell className="w-24">
                            {isExempt ? (
                              <Badge className="border-transparent bg-accent/10 text-accent">
                                {t("assignmentDetail.exempt")}
                              </Badge>
                            ) : isLate ? (
                              <Badge className="border-transparent bg-warning/10 text-warning">
                                {t("assignmentDetail.late")}
                              </Badge>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              {isExtraCredit && (
                                <Badge className="border-transparent bg-warning/10 text-warning">
                                  {t("assignmentDetail.extraCredit")}
                                </Badge>
                              )}
                              {row.score !== null && (
                                <span className="text-sm text-muted">
                                  {Math.round((row.score / assignment.max_score) * 100)}%
                                </span>
                              )}
                              <input
                                type="number"
                                min="0"
                                step="any"
                                placeholder="—"
                                value={displayVal}
                                disabled={isExempt}
                                onChange={(e) => handleChange(row.student_id, e.target.value)}
                                onBlur={(e) => handleBlur(row.student_id, e.target.value)}
                                className={cn(
                                  "flex h-9 w-20 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none",
                                  isExempt && "cursor-not-allowed opacity-50",
                                )}
                              />
                              <span className="w-12 shrink-0 text-xs text-muted">
                                / {assignment.max_score}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {scores.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                    <Inbox className="size-6 text-muted" />
                    <span className="text-sm font-medium text-muted">
                      {t("assignmentDetail.noStudents")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={noteOpen}
        onOpenChange={(open) => {
          if (!open && !savingNote) closeNoteModal();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {noteModal
                ? `${t("assignmentDetail.noteModalTitle")} - ${noteModal.studentName}`
                : t("assignmentDetail.noteModalTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <textarea
              rows={4}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={t("assignmentDetail.notePlaceholder")}
              autoFocus
              className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeNoteModal} disabled={savingNote}>
              {t("common.cancel")}
            </Button>
            <Button type="button" onClick={handleNoteSave} disabled={savingNote}>
              {savingNote ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                t("assignmentDetail.noteSave")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onConfirm={async () => {
          await saveAll();
          setSaveModalOpen(false);
        }}
        title={t("assignmentDetail.saveModalTitle")}
        description={t("assignmentDetail.saveModalDescription")}
        confirmLabel={t("common.save")}
        loading={saving}
      />

      <ConfirmModal
        isOpen={pendingNav !== null}
        onClose={() => setPendingNav(null)}
        onConfirm={() => {
          pendingNav?.();
          setPendingNav(null);
        }}
        title={t("assignmentDetail.leaveModalTitle")}
        description={t("assignmentDetail.leaveModalDescription")}
        confirmLabel={t("assignmentDetail.leaveModalConfirm")}
      />
    </div>
  );
}
