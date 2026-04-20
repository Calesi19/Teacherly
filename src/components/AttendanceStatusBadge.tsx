import { Chip } from "@heroui/react";
import type { AttendanceStatus } from "../types/attendance";

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: "success" | "danger" | "warning" | "default" }> = {
  present: { label: "Present", color: "success" },
  absent: { label: "Absent", color: "danger" },
  late: { label: "Late", color: "warning" },
  early_pickup: { label: "Early Pickup", color: "default" },
};

interface AttendanceStatusBadgeProps {
  status: AttendanceStatus;
}

export function AttendanceStatusBadge({ status }: AttendanceStatusBadgeProps) {
  const { label, color } = STATUS_CONFIG[status];
  return (
    <Chip color={color} size="sm" variant="soft">
      {label}
    </Chip>
  );
}
