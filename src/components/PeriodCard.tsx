import { Button } from "@heroui/react";
import { Trash2 } from "lucide-react";
import type { SchedulePeriod } from "../types/schedule";

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${suffix}`;
}

interface PeriodCardProps {
  period: SchedulePeriod;
  onDelete: (id: number) => void;
}

export function PeriodCard({ period, onDelete }: PeriodCardProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-background border border-border/60">
      <span className="text-xs font-mono text-foreground/50 w-28 shrink-0">
        {formatTime(period.start_time)} – {formatTime(period.end_time)}
      </span>
      <span className="flex-1 font-medium text-sm">{period.name}</span>
      <Button
        variant="ghost"
        isIconOnly
        size="sm"
        aria-label="Delete period"
        onPress={() => onDelete(period.id)}
      >
        <Trash2 size={14} />
      </Button>
    </div>
  );
}
