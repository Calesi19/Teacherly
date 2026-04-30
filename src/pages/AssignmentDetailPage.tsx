import { useState, useEffect, useMemo } from "react";
import Database from "@tauri-apps/plugin-sql";
import { Check, Inbox, MoreHorizontal, Pencil } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import { formatScore, formatScorePercentage } from "@/lib/formatScore";
import { cn } from "@/lib/utils";
import { Breadcrumb } from "../components/Breadcrumb";
import { ConfirmModal } from "../components/ConfirmModal";
import { PageBackButton } from "../components/PageBackButton";
import { useAssignmentDetail } from "../hooks/useAssignmentDetail";
import { useSchedule } from "../hooks/useSchedule";
import { useTranslation } from "../i18n/LanguageContext";
import type { Group } from "../types/group";
import type { Assignment, AssignmentTag } from "../types/assignment";

interface AssignmentDetailPageProps {
  assignment: Assignment;
  group: Group;
  onGoToGroups: () => void;
  onGoToStudents: () => void;
  onGoToAssignments: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

interface NoteModalState {
  studentId: number;
  studentName: string;
  currentNote: string | null;
}

const DB_URL = "sqlite:teacherly.db";
const TAG_OPTIONS: AssignmentTag[] = [
  "Exam",
  "Quiz",
  "Homework",
  "Extra Credit",
  "Project",
  "Other",
];

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
  const [currentAssignment, setCurrentAssignment] = useState(assignment);
  const {
    scores,
    loading,
    error,
    upsertScore,
    setExempt,
    setLate,
    setNote,
    stats,
  } = useAssignmentDetail(currentAssignment.id, group.id, currentAssignment.max_score);
  const { t } = useTranslation();
  const { periods } = useSchedule(group.id);

  const [pendingScores, setPendingScores] = useState<Map<number, string>>(
    new Map(),
  );
  const [pendingLate, setPendingLate] = useState<Map<number, boolean>>(
    new Map(),
  );
  const [pendingExempt, setPendingExempt] = useState<Map<number, boolean>>(
    new Map(),
  );

  const [noteModal, setNoteModal] = useState<NoteModalState | null>(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingNav, setPendingNav] = useState<(() => void) | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: assignment.title,
    description: assignment.description ?? "",
    max_score: String(assignment.max_score),
    period_name: assignment.period_name,
    tag: assignment.tag,
  });
  const [savingDetails, setSavingDetails] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentAssignment(assignment);
    setEditForm({
      title: assignment.title,
      description: assignment.description ?? "",
      max_score: String(assignment.max_score),
      period_name: assignment.period_name,
      tag: assignment.tag,
    });
  }, [assignment]);

  const uniquePeriodNames = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const period of periods) {
      if (!seen.has(period.name)) {
        seen.add(period.name);
        result.push(period.name);
      }
    }
    if (currentAssignment.period_name && !seen.has(currentAssignment.period_name)) {
      result.push(currentAssignment.period_name);
    }
    return result;
  }, [currentAssignment.period_name, periods]);

  const tagLabels: Record<AssignmentTag, string> = {
    Exam: t("assignments.tags.exam"),
    Quiz: t("assignments.tags.quiz"),
    Homework: t("assignments.tags.homework"),
    "Extra Credit": t("assignments.tags.extraCredit"),
    Project: t("assignments.tags.project"),
    Other: t("assignments.tags.other"),
  };

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

  const openEditDialog = () => {
    setEditForm({
      title: currentAssignment.title,
      description: currentAssignment.description ?? "",
      max_score: String(currentAssignment.max_score),
      period_name: currentAssignment.period_name,
      tag: currentAssignment.tag,
    });
    setEditError(null);
    setEditOpen(true);
  };

  const closeEditDialog = () => {
    setEditError(null);
    setEditOpen(false);
  };

  const handleDetailsSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsedMaxScore = parseFloat(editForm.max_score);
    if (
      !editForm.title.trim() ||
      Number.isNaN(parsedMaxScore) ||
      parsedMaxScore <= 0 ||
      !editForm.period_name ||
      !editForm.tag
    ) {
      return;
    }

    setSavingDetails(true);
    setEditError(null);
    try {
      const db = await Database.load(DB_URL);
      await db.execute(
        `UPDATE assignments
         SET title = ?, description = ?, max_score = ?, period_name = ?, tag = ?
         WHERE id = ? AND is_deleted = 0`,
        [
          editForm.title.trim(),
          editForm.description.trim() || null,
          parsedMaxScore,
          editForm.period_name,
          editForm.tag,
          currentAssignment.id,
        ],
      );

      setCurrentAssignment((prev) => ({
        ...prev,
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        max_score: parsedMaxScore,
        period_name: editForm.period_name,
        tag: editForm.tag as AssignmentTag,
      }));
      setEditOpen(false);
    } catch (err) {
      setEditError(String(err));
    } finally {
      setSavingDetails(false);
    }
  };

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

  const getDisplayValue = (
    studentId: number,
    dbScore: number | null,
  ): string => {
    if (pendingScores.has(studentId)) return pendingScores.get(studentId) ?? "";
    return dbScore !== null ? String(dbScore) : "";
  };

  const getLiveScore = (value: string): number | null => {
    const trimmed = value.trim();
    if (trimmed === "") return null;

    const parsed = parseFloat(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
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
    <div className="flex h-full flex-col px-6 pt-8 pb-3 pl-3">
      <Breadcrumb
        items={[
          {
            label: t("groups.breadcrumb"),
            onClick: () => guardedNav(onGoToGroups),
          },
          { label: group.name, onClick: () => guardedNav(onGoToStudents) },
          {
            label: t("assignments.breadcrumb"),
            onClick: () => guardedNav(onGoToAssignments),
          },
          { label: currentAssignment.title },
        ]}
      />

      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <PageBackButton
            label={t("common.back")}
            onClick={() => guardedNav(onGoToAssignments)}
          />
          <div>
            <h2 className="text-2xl font-bold">{currentAssignment.title}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={openEditDialog}>
            <Pencil className="size-4" />
            {t("common.edit")}
          </Button>
          {hasChanges && (
            <Button size="sm" onClick={() => setSaveModalOpen(true)}>
              {t("common.save")}
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : error ? (
        <div
          role="alert"
          className="mb-6 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {error}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <SectionCard className="mb-6 flex flex-col gap-4 bg-muted/40">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("assignmentDetail.worth")}
                </span>
                <span className="text-2xl font-bold">
                  {formatScore(currentAssignment.max_score)}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    {t("assignmentDetail.ptsMax")}
                  </span>
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("assignmentDetail.graded")}
                </span>
                <span className="text-2xl font-bold">
                  {stats.gradedCount}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    / {scores.length}
                  </span>
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("assignmentDetail.description")}
              </span>
              <p className="whitespace-pre-wrap text-sm text-foreground/80">
                {currentAssignment.description?.trim() ||
                  t("assignmentDetail.noDescription")}
              </p>
            </div>
          </SectionCard>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex h-full flex-1 flex-col overflow-hidden rounded-xl border bg-background">
              <div className="shrink-0 border-b border-border/45 bg-[color:var(--table-header)]">
                <table className="w-full table-fixed text-sm">
                  <colgroup>
                    <col className="w-12" />
                    <col />
                    <col className="w-32" />
                    <col className="w-72" />
                  </colgroup>
                  <thead>
                    <TableRow>
                      <TableHead className="w-12" />
                      <TableHead className="text-foreground/70">
                        {t("students.tableColumns.name")}
                      </TableHead>
                      <TableHead className="text-foreground/70" />
                      <TableHead className="text-right text-foreground/70 pr-14">
                        {t("assignmentDetail.scoreColumn")}
                      </TableHead>
                    </TableRow>
                  </thead>
                </table>
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full table-fixed text-sm">
                  <colgroup>
                    <col className="w-12" />
                    <col />
                    <col className="w-32" />
                    <col className="w-72" />
                  </colgroup>
                  <TableBody>
                    {scores.map((row) => {
                      const displayVal = getDisplayValue(
                        row.student_id,
                        row.score,
                      );
                      const liveScore = getLiveScore(displayVal);
                      const isExtraCredit =
                        liveScore !== null &&
                        liveScore > currentAssignment.max_score;
                      const isExempt = pendingExempt.has(row.student_id)
                        ? (pendingExempt.get(row.student_id) ?? false)
                        : row.exempt === 1;
                      const isLate = pendingLate.has(row.student_id)
                        ? (pendingLate.get(row.student_id) ?? false)
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
                              <DropdownMenuContent
                                align="start"
                                sideOffset={4}
                                className="w-52"
                              >
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
                                      <Check
                                        size={12}
                                        className="text-warning"
                                      />
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
                                      <Check
                                        size={12}
                                        className="text-accent"
                                      />
                                    ) : (
                                      <span className="w-3" />
                                    )}
                                  </span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    openNoteModal(
                                      row.student_id,
                                      row.student_name,
                                      row.note,
                                    )
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
                            <span className="font-medium">
                              {row.student_name}
                            </span>
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
                              {liveScore !== null && (
                                <span className="text-sm text-muted-foreground">
                                  {formatScorePercentage(
                                    liveScore,
                                    currentAssignment.max_score,
                                  )}
                                  %
                                </span>
                              )}
                              <input
                                type="number"
                                min="0"
                                step="any"
                                placeholder="—"
                                value={displayVal}
                                disabled={isExempt}
                                onChange={(e) =>
                                  handleChange(row.student_id, e.target.value)
                                }
                                onBlur={(e) =>
                                  handleBlur(row.student_id, e.target.value)
                                }
                                className={cn(
                                  "flex h-9 w-20 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none",
                                  isExempt && "cursor-not-allowed opacity-50",
                                )}
                              />
                              <span className="w-12 shrink-0 text-xs text-muted-foreground">
                                / {formatScore(currentAssignment.max_score)}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </table>

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
        open={editOpen}
        onOpenChange={(open) => {
          if (!open && !savingDetails) closeEditDialog();
        }}
      >
        <DialogContent>
          <form onSubmit={handleDetailsSave}>
            <DialogHeader>
              <DialogTitle>{t("assignmentDetail.editDetails")}</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-assignment-title">
                  {t("assignments.addModal.titleLabel")}
                </Label>
                <Input
                  id="edit-assignment-title"
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                  placeholder={t("assignments.addModal.titlePlaceholder")}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-assignment-description">
                  {t("assignments.addModal.descriptionLabel")}
                </Label>
                <textarea
                  id="edit-assignment-description"
                  rows={3}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  placeholder={t("assignments.addModal.descriptionPlaceholder")}
                  className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-assignment-max-score">
                  {t("assignments.addModal.maxScoreLabel")}
                </Label>
                <Input
                  id="edit-assignment-max-score"
                  type="number"
                  min="0"
                  step="any"
                  value={editForm.max_score}
                  onChange={(e) =>
                    setEditForm({ ...editForm, max_score: e.target.value })
                  }
                  placeholder={t("assignments.addModal.maxScorePlaceholder")}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>{t("assignments.addModal.periodLabel")}</Label>
                {uniquePeriodNames.length === 0 ? (
                  <select
                    disabled
                    className="flex h-9 w-full cursor-not-allowed rounded-md border border-input bg-background px-3 py-1 text-sm opacity-50"
                  >
                    <option>{t("assignments.addModal.noPeriods")}</option>
                  </select>
                ) : (
                  <Select
                    value={editForm.period_name || undefined}
                    onValueChange={(value) =>
                      setEditForm({ ...editForm, period_name: value ?? "" })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={t("assignments.addModal.selectPeriod")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {uniquePeriodNames.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>{t("assignments.addModal.tagLabel")}</Label>
                <div className="flex flex-wrap gap-2">
                  {TAG_OPTIONS.map((tag) => {
                    const isSelected = editForm.tag === tag;
                    return (
                      <Badge
                        key={tag}
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer transition-transform active:scale-95",
                          !isSelected &&
                            "text-foreground/60 hover:text-foreground",
                        )}
                        onClick={() => setEditForm({ ...editForm, tag })}
                      >
                        {tagLabels[tag]}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {editError && <p className="text-sm text-danger">{editError}</p>}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={closeEditDialog}
                disabled={savingDetails}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={
                  savingDetails ||
                  !editForm.title.trim() ||
                  !editForm.max_score ||
                  !editForm.period_name ||
                  !editForm.tag ||
                  uniquePeriodNames.length === 0
                }
              >
                {savingDetails ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  t("common.save")
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
            <Button
              type="button"
              variant="ghost"
              onClick={closeNoteModal}
              disabled={savingNote}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleNoteSave}
              disabled={savingNote}
            >
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
        confirmVariant="default"
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
