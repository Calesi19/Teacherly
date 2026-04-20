import { useState } from "react";
import { Button } from "@heroui/react";
import type { SchedulePeriod } from "../types/schedule";
import type { StudentAttendanceRow, AttendanceStatus } from "../types/attendance";

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${suffix}`;
}

const STATUSES: AttendanceStatus[] = ["present", "absent", "late", "early_pickup"];
const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  early_pickup: "Early Pickup",
};

interface AttendancePeriodSectionProps {
  period: SchedulePeriod;
  rows: StudentAttendanceRow[];
  onSetStatus: (studentId: number, periodId: number, status: AttendanceStatus) => void;
  onSetStatusBulk: (studentIds: number[], periodId: number, status: AttendanceStatus) => void;
  onMarkEarlyPickup: (studentId: number, periodId: number) => void;
}

export function AttendancePeriodSection({
  period,
  rows,
  onSetStatus,
  onSetStatusBulk,
  onMarkEarlyPickup,
}: AttendancePeriodSectionProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggleSelect = (studentId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === rows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((r) => r.student_id)));
    }
  };

  const handleBulk = (status: AttendanceStatus) => {
    if (selected.size === 0) return;
    onSetStatusBulk(Array.from(selected), period.id, status);
    setSelected(new Set());
  };

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const someSelected = selected.size > 0;

  return (
    <div className="rounded-2xl border border-border/60 bg-background overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-background-secondary border-b border-border/60">
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => { if (el) el.indeterminate = !allSelected && someSelected; }}
          onChange={toggleSelectAll}
          aria-label="Select all students"
          className="w-4 h-4 cursor-pointer"
        />
        <div className="flex-1">
          <span className="font-semibold text-sm">{period.name}</span>
          <span className="ml-2 text-xs text-foreground/50">
            {formatTime(period.start_time)} – {formatTime(period.end_time)}
          </span>
        </div>
        {someSelected && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-foreground/50 mr-1">{selected.size} selected:</span>
            <Button variant="ghost" size="sm" onPress={() => handleBulk("present")}>Present</Button>
            <Button variant="ghost" size="sm" onPress={() => handleBulk("absent")}>Absent</Button>
            <Button variant="ghost" size="sm" onPress={() => handleBulk("late")}>Late</Button>
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
            <span className="flex-1 text-sm font-medium">{row.student_name}</span>
            <div className="flex items-center gap-1">
              {STATUSES.map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    if (status === "early_pickup") {
                      onMarkEarlyPickup(row.student_id, period.id);
                    } else {
                      onSetStatus(row.student_id, period.id, status);
                    }
                  }}
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
                  {STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
