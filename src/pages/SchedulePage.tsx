import { Button, Spinner } from "@heroui/react";
import { CalendarCheck } from "lucide-react";
import { useSchedule } from "../hooks/useSchedule";
import { Breadcrumb } from "../components/Breadcrumb";
import { AddPeriodModal } from "../components/AddPeriodModal";
import { PeriodCard } from "../components/PeriodCard";
import { DAY_LABELS } from "../types/schedule";
import type { DayOfWeek } from "../types/schedule";
import type { Classroom } from "../types/classroom";

interface SchedulePageProps {
  classroom: Classroom;
  onGoToClassrooms: () => void;
  onGoToStudents: () => void;
  onGoToAttendance: () => void;
}

const ORDERED_DAYS: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];

export function SchedulePage({
  classroom,
  onGoToClassrooms,
  onGoToStudents,
  onGoToAttendance,
}: SchedulePageProps) {
  const { periods, loading, error, addPeriod, deletePeriod, periodsByDay } = useSchedule(
    classroom.id
  );

  return (
    <div className="p-6 flex flex-col h-full">
      <Breadcrumb
        items={[
          { label: "Classrooms", onClick: onGoToClassrooms },
          { label: classroom.name, onClick: onGoToStudents },
          { label: "Schedule" },
        ]}
      />

      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Schedule</h2>
          <p className="text-sm text-muted">
            {classroom.subject && <span>{classroom.subject} · </span>}
            {classroom.grade && <span>{classroom.grade}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onPress={onGoToAttendance}>
            <CalendarCheck size={15} className="mr-1" />
            Take Attendance
          </Button>
          <AddPeriodModal onAdd={addPeriod} />
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" color="accent" />
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-lg bg-danger/10 text-danger px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && periods.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 text-center gap-3">
          <p className="text-lg font-semibold text-muted">No schedule set up yet</p>
          <p className="text-sm text-foreground/40">
            Add periods to define when this class meets each week.
          </p>
          <AddPeriodModal onAdd={addPeriod} />
        </div>
      )}

      {!loading && !error && periods.length > 0 && (
        <div className="flex flex-col gap-6">
          {ORDERED_DAYS.filter((day) => periodsByDay.has(day)).map((day) => (
            <div key={day}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-foreground/60">
                  {DAY_LABELS[day]}
                </h3>
                <span className="text-xs text-foreground/40">
                  ({periodsByDay.get(day)!.length} period{periodsByDay.get(day)!.length !== 1 ? "s" : ""})
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {periodsByDay.get(day)!.map((period) => (
                  <PeriodCard key={period.id} period={period} onDelete={deletePeriod} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
