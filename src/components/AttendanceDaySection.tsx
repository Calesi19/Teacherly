import { useState, useEffect } from "react";
import { Button, Modal, useOverlayState } from "@heroui/react";
import { useTranslation } from "../i18n/LanguageContext";
import type { DayAttendanceStatus, StudentDayStatus } from "../types/attendance";

const DAY_STATUSES: DayAttendanceStatus[] = [
  "present",
  "absent",
  "late",
  "early_pickup",
  "late_arrival",
];

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${suffix}`;
}

interface AttendanceDaySectionProps {
  rows: StudentDayStatus[];
  onMarkPresent: (studentId: number) => void;
  onMarkAbsent: (studentId: number) => void;
  onMarkLate: (studentId: number) => void;
  onMarkEarlyPickup: (studentId: number, time: string) => void;
  onMarkLateArrival: (studentId: number, time: string) => void;
  onMarkBulk: (studentIds: number[], status: "present" | "absent" | "late") => void;
}

type TimeModalState = {
  type: "early_pickup" | "late_arrival";
  studentId: number;
  studentName: string;
} | null;

function TimeModal({
  state: modalState,
  timeModal,
  timeInput,
  setTimeInput,
  onConfirm,
  onClose,
}: {
  state: ReturnType<typeof useOverlayState>;
  timeModal: TimeModalState;
  timeInput: string;
  setTimeInput: (v: string) => void;
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
              {timeModal?.type === "early_pickup" ? t("attendance.timeModal.earlyPickup") : t("attendance.timeModal.lateArrival")} —{" "}
              {timeModal?.studentName}
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4 pb-px overflow-visible">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">
                  {timeModal?.type === "early_pickup" ? t("attendance.timeModal.pickupTime") : t("attendance.timeModal.arrivalTime")}
                </label>
                <input
                  type="time"
                  value={timeInput}
                  onChange={(e) => setTimeInput(e.target.value)}
                  className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  autoFocus
                />
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" onPress={onClose}>
                {t("common.cancel")}
              </Button>
              <Button variant="primary" onPress={onConfirm} isDisabled={!timeInput}>
                {t("attendance.timeModal.confirm")}
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
  onMarkEarlyPickup,
  onMarkLateArrival,
  onMarkBulk,
}: AttendanceDaySectionProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [timeModal, setTimeModal] = useState<TimeModalState>(null);
  const [timeInput, setTimeInput] = useState("");
  const modalState = useOverlayState();

  const statusLabels: Record<DayAttendanceStatus, string> = {
    present: t("attendance.status.present"),
    absent: t("attendance.status.absent"),
    late: t("attendance.status.late"),
    early_pickup: t("attendance.status.earlyPickup"),
    late_arrival: t("attendance.status.lateArrival"),
  };

  useEffect(() => {
    if (timeModal) modalState.open();
    else modalState.close();
  }, [timeModal]);

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
    if (status === "early_pickup") {
      setTimeInput("");
      setTimeModal({ type: "early_pickup", studentId: row.student_id, studentName: row.student_name });
    } else if (status === "late_arrival") {
      setTimeInput("");
      setTimeModal({ type: "late_arrival", studentId: row.student_id, studentName: row.student_name });
    } else if (status === "present") {
      onMarkPresent(row.student_id);
    } else if (status === "absent") {
      onMarkAbsent(row.student_id);
    } else if (status === "late") {
      onMarkLate(row.student_id);
    }
  };

  const handleTimeConfirm = () => {
    if (!timeModal || !timeInput) return;
    if (timeModal.type === "early_pickup") {
      onMarkEarlyPickup(timeModal.studentId, timeInput);
    } else {
      onMarkLateArrival(timeModal.studentId, timeInput);
    }
    setTimeModal(null);
    setTimeInput("");
  };

  const handleModalClose = () => {
    setTimeModal(null);
    setTimeInput("");
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
                {row.time && (
                  <span className="ml-2 text-xs text-foreground/40">({formatTime(row.time)})</span>
                )}
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
                          : status === "early_pickup"
                          ? "bg-secondary/20 text-secondary-foreground"
                          : "bg-primary/20 text-primary"
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

      <TimeModal
        state={modalState}
        timeModal={timeModal}
        timeInput={timeInput}
        setTimeInput={setTimeInput}
        onConfirm={handleTimeConfirm}
        onClose={handleModalClose}
      />
    </>
  );
}
