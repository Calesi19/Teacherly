import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useTranslation } from "../i18n/LanguageContext";
import type {
  DayAttendanceStatus,
  StudentDayStatus,
} from "../types/attendance";

const DAY_STATUSES: DayAttendanceStatus[] = [
  "present",
  "absent",
  "late",
  "partial",
];

interface AttendanceDaySectionProps {
  rows: StudentDayStatus[];
  onMarkPresent: (studentId: number) => void;
  onMarkAbsent: (studentId: number) => void;
  onMarkLate: (studentId: number) => void;
  onMarkPartial: (
    studentId: number,
    periodStatuses: { periodId: number; status: "present" | "absent" }[],
    note?: string,
  ) => void;
  onMarkBulk: (
    studentIds: number[],
    status: "present" | "absent" | "late",
  ) => void;
}

type PartialModalState = {
  studentIds: number[];
  studentName: string;
  periodStatuses: {
    periodId: number;
    periodName: string;
    status: "present" | "absent";
  }[];
  note: string;
} | null;

function PartialModal({
  open,
  partial,
  onToggle,
  onNoteChange,
  onConfirm,
  onClose,
}: {
  open: boolean;
  partial: PartialModalState;
  onToggle: (periodId: number, status: "present" | "absent") => void;
  onNoteChange: (note: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("attendance.partialModal.title")} — {partial?.studentName}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {partial?.periodStatuses.map((ps) => (
            <div
              key={ps.periodId}
              className="flex items-center justify-between gap-3"
            >
              <span className="text-sm font-medium">{ps.periodName}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onToggle(ps.periodId, "present")}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                    ps.status === "present"
                      ? "bg-success/20 text-success"
                      : "text-foreground/40 hover:text-foreground hover:bg-foreground/5"
                  }`}
                >
                  {t("attendance.status.present")}
                </button>
                <button
                  onClick={() => onToggle(ps.periodId, "absent")}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                    ps.status === "absent"
                      ? "bg-danger/20 text-danger"
                      : "text-foreground/40 hover:text-foreground hover:bg-foreground/5"
                  }`}
                >
                  {t("attendance.status.absent")}
                </button>
              </div>
            </div>
          ))}
          <div className="flex flex-col gap-1.5 pt-1 border-t border-border/40">
            <label className="text-xs font-medium text-foreground/60">
              {t("attendance.partialModal.noteLabel")}
            </label>
            <textarea
              value={partial?.note ?? ""}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder={t("attendance.partialModal.notePlaceholder")}
              rows={2}
              className="w-full rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={onConfirm}>
            {t("attendance.partialModal.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AttendanceDaySection({
  rows,
  onMarkPresent,
  onMarkAbsent,
  onMarkLate,
  onMarkPartial,
  onMarkBulk,
}: AttendanceDaySectionProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [partialModal, setPartialModal] = useState<PartialModalState>(null);

  const statusLabels: Record<DayAttendanceStatus, string> = {
    present: t("attendance.status.present"),
    absent: t("attendance.status.absent"),
    late: t("attendance.status.late"),
    partial: t("attendance.status.partial"),
  };

  const toggleSelect = (studentId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.student_id)));
  };

  const handleBulk = (status: "present" | "absent" | "late") => {
    if (selected.size === 0) return;
    onMarkBulk(Array.from(selected), status);
    setSelected(new Set());
  };

  const handleStatusClick = (
    row: StudentDayStatus,
    status: DayAttendanceStatus,
  ) => {
    if (status === "partial") {
      setPartialModal({
        studentIds: [row.student_id],
        studentName: row.student_name,
        periodStatuses: row.periodStatuses.map((ps) => ({ ...ps })),
        note: "",
      });
    } else if (status === "present") {
      onMarkPresent(row.student_id);
    } else if (status === "absent") {
      onMarkAbsent(row.student_id);
    } else if (status === "late") {
      onMarkLate(row.student_id);
    }
  };

  const handleTogglePeriod = (
    periodId: number,
    status: "present" | "absent",
  ) => {
    setPartialModal((prev) =>
      prev
        ? {
            ...prev,
            periodStatuses: prev.periodStatuses.map((ps) =>
              ps.periodId === periodId ? { ...ps, status } : ps,
            ),
          }
        : null,
    );
  };

  const handleNoteChange = (note: string) => {
    setPartialModal((prev) => (prev ? { ...prev, note } : null));
  };

  const handlePartialConfirm = () => {
    if (!partialModal) return;
    onMarkPartial(
      partialModal.studentIds[0],
      partialModal.periodStatuses,
      partialModal.note,
    );
    setPartialModal(null);
  };

  const handleModalClose = () => {
    setPartialModal(null);
  };

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const someSelected = selected.size > 0;

  return (
    <>
      <div className="rounded-2xl border border-border/60 bg-background overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 bg-background-secondary border-b border-border/60">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = !allSelected && someSelected;
            }}
            onChange={toggleSelectAll}
            aria-label="Select all students"
            className="w-4 h-4 cursor-pointer"
          />
          <span className="flex-1 font-semibold text-sm">
            {t("attendance.studentsHeader")}
          </span>
          {someSelected && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-foreground/50 mr-1">
                {selected.size} {t("attendance.selected")}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBulk("present")}
              >
                {t("attendance.status.present")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBulk("absent")}
              >
                {t("attendance.status.absent")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBulk("late")}
              >
                {t("attendance.status.late")}
              </Button>
            </div>
          )}
        </div>

        <div className="divide-y divide-border/40">
          {rows.map((row) => (
            <div
              key={row.student_id}
              className="flex items-center gap-3 px-4 py-2.5"
            >
              <input
                type="checkbox"
                checked={selected.has(row.student_id)}
                onChange={() => toggleSelect(row.student_id)}
                aria-label={`Select ${row.student_name}`}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="flex-1 text-sm font-medium">
                {row.student_name}
              </span>
              <div className="flex items-center gap-1">
                {DAY_STATUSES.map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusClick(row, status)}
                    className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                      row.status === status
                        ? status === "present"
                          ? "border-success/30 bg-success/15 text-success"
                          : status === "absent"
                            ? "border-danger/30 bg-danger/15 text-danger"
                            : status === "late"
                              ? "border-warning/30 bg-warning/15 text-warning"
                              : "border-accent/25 bg-accent/10 text-accent"
                        : "border-transparent text-foreground/40 hover:bg-foreground/5 hover:text-foreground"
                    }`}
                    aria-pressed={row.status === status}
                  >
                    {statusLabels[status]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <PartialModal
        open={partialModal !== null}
        partial={partialModal}
        onToggle={handleTogglePeriod}
        onNoteChange={handleNoteChange}
        onConfirm={handlePartialConfirm}
        onClose={handleModalClose}
      />
    </>
  );
}
