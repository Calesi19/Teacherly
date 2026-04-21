import { useState, useEffect } from "react";
import { Button, Modal, useOverlayState } from "@heroui/react";
import { useTranslation } from "../i18n/LanguageContext";
import type { DayAttendanceStatus, StudentDayStatus } from "../types/attendance";

const DAY_STATUSES: DayAttendanceStatus[] = ["present", "absent", "late", "partial"];

interface AttendanceDaySectionProps {
  rows: StudentDayStatus[];
  onMarkPresent: (studentId: number) => void;
  onMarkAbsent: (studentId: number) => void;
  onMarkLate: (studentId: number) => void;
  onMarkPartial: (studentId: number, periodStatuses: { periodId: number; status: "present" | "absent" }[]) => void;
  onMarkBulk: (studentIds: number[], status: "present" | "absent" | "late") => void;
}

type PartialModalState = {
  studentId: number;
  studentName: string;
  periodStatuses: { periodId: number; periodName: string; status: "present" | "absent" }[];
} | null;

function PartialModal({
  state: modalState,
  partial,
  onToggle,
  onConfirm,
  onClose,
}: {
  state: ReturnType<typeof useOverlayState>;
  partial: PartialModalState;
  onToggle: (periodId: number, status: "present" | "absent") => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Modal state={modalState} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>
              {t("attendance.partialModal.title")} — {partial?.studentName}
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4 pb-px overflow-visible">
              {partial?.periodStatuses.map((ps) => (
                <div key={ps.periodId} className="flex items-center justify-between gap-3">
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
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" onPress={onClose}>
                {t("common.cancel")}
              </Button>
              <Button variant="primary" onPress={onConfirm}>
                {t("attendance.partialModal.confirm")}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
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
  const modalState = useOverlayState();

  const statusLabels: Record<DayAttendanceStatus, string> = {
    present: t("attendance.status.present"),
    absent: t("attendance.status.absent"),
    late: t("attendance.status.late"),
    partial: t("attendance.status.partial"),
  };

  useEffect(() => {
    if (partialModal) modalState.open();
    else modalState.close();
  }, [partialModal]);

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

  const handleStatusClick = (row: StudentDayStatus, status: DayAttendanceStatus) => {
    if (status === "partial") {
      setPartialModal({
        studentId: row.student_id,
        studentName: row.student_name,
        periodStatuses: row.periodStatuses.map((ps) => ({ ...ps })),
      });
    } else if (status === "present") {
      onMarkPresent(row.student_id);
    } else if (status === "absent") {
      onMarkAbsent(row.student_id);
    } else if (status === "late") {
      onMarkLate(row.student_id);
    }
  };

  const handleTogglePeriod = (periodId: number, status: "present" | "absent") => {
    setPartialModal((prev) =>
      prev
        ? {
            ...prev,
            periodStatuses: prev.periodStatuses.map((ps) =>
              ps.periodId === periodId ? { ...ps, status } : ps
            ),
          }
        : null
    );
  };

  const handlePartialConfirm = () => {
    if (!partialModal) return;
    onMarkPartial(
      partialModal.studentId,
      partialModal.periodStatuses.map(({ periodId, status }) => ({ periodId, status }))
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
          <span className="flex-1 font-semibold text-sm">{t("attendance.studentsHeader")}</span>
          {someSelected && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-foreground/50 mr-1">{selected.size} {t("attendance.selected")}</span>
              <Button variant="ghost" size="sm" onPress={() => handleBulk("present")}>
                {t("attendance.status.present")}
              </Button>
              <Button variant="ghost" size="sm" onPress={() => handleBulk("absent")}>
                {t("attendance.status.absent")}
              </Button>
              <Button variant="ghost" size="sm" onPress={() => handleBulk("late")}>
                {t("attendance.status.late")}
              </Button>
            </div>
          )}
        </div>

        <div className="divide-y divide-border/40">
          {rows.map((row) => (
            <div key={row.student_id} className="flex items-center gap-3 px-4 py-2.5">
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
                    className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                      row.status === status
                        ? status === "present"
                          ? "bg-success/20 text-success"
                          : status === "absent"
                          ? "bg-danger/20 text-danger"
                          : status === "late"
                          ? "bg-warning/20 text-warning"
                          : "bg-secondary/20 text-secondary-foreground"
                        : "text-foreground/40 hover:text-foreground hover:bg-foreground/5"
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
        state={modalState}
        partial={partialModal}
        onToggle={handleTogglePeriod}
        onConfirm={handlePartialConfirm}
        onClose={handleModalClose}
      />
    </>
  );
}
