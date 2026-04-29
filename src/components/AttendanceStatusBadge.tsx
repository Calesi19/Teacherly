import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "../types/attendance";

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; className: string }> = {
  present: { label: "Present", className: "bg-success/15 text-success border-success/30 hover:bg-success/15" },
  absent: { label: "Absent", className: "bg-danger/15 text-danger border-danger/30 hover:bg-danger/15" },
  late: { label: "Late", className: "bg-warning/15 text-warning border-warning/30 hover:bg-warning/15" },
  early_pickup: { label: "Early Pickup", className: "bg-foreground/10 text-foreground/70 border-foreground/20 hover:bg-foreground/10" },
};

interface AttendanceStatusBadgeProps {
  status: AttendanceStatus;
}

export function AttendanceStatusBadge({ status }: AttendanceStatusBadgeProps) {
  const { label, className } = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", className)}>
      {label}
    </Badge>
  );
}
