import { useState } from "react";
import { Button, Spinner } from "@heroui/react";
import { CalendarDays } from "lucide-react";

import { useAttendance } from "../hooks/useAttendance";
import { Breadcrumb } from "../components/Breadcrumb";
import { DateNavigator } from "../components/DateNavigator";
import { AttendanceDaySection } from "../components/AttendanceDaySection";
import type { Group } from "../types/group";

interface AttendancePageProps {
  group: Group;
  onGoToGroups: () => void;
  onGoToStudents: () => void;
  onGoToSchedule: () => void;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function AttendancePage({
  group,
  onGoToGroups,
  onGoToStudents,
  onGoToSchedule,
}: AttendancePageProps) {
  const [date, setDate] = useState(todayStr);
  const {
    periodsForDay,
    allStudents,
    dayStatuses,
    loading,
    error,
    markPresent,
    markAbsent,
    markLate,
    markEarlyPickup,
    markLateArrival,
    markDayStatusBulk,
  } = useAttendance(group.id, date);

  return (
    <div className="p-6 flex flex-col h-full">
      <Breadcrumb
        items={[
          { label: "Groups", onClick: onGoToGroups },
          { label: group.name, onClick: onGoToStudents },
          { label: "Attendance" },
        ]}
      />

      <div className="flex items-start justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold">Attendance</h2>
          <p className="text-sm text-muted">
            {group.subject && <span>{group.subject} · </span>}
            {group.grade && <span>{group.grade}</span>}
          </p>
        </div>
      </div>

      <DateNavigator date={date} onChange={setDate} />

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

      {!loading && !error && periodsForDay.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 text-center gap-3 mt-8">
          <CalendarDays size={40} className="text-foreground/20" />
          <p className="text-lg font-semibold text-muted">No periods scheduled for this day</p>
          <p className="text-sm text-foreground/40">
            Set up a schedule to define when this class meets.
          </p>
          <Button variant="primary" size="sm" onPress={onGoToSchedule}>
            Set Up Schedule
          </Button>
        </div>
      )}

      {!loading && !error && allStudents.length === 0 && periodsForDay.length > 0 && (
        <div className="flex flex-col items-center justify-center flex-1 text-center gap-2 mt-8">
          <p className="text-lg font-semibold text-muted">No students enrolled</p>
          <p className="text-sm text-foreground/40">Add students to start tracking attendance.</p>
          <Button variant="ghost" size="sm" onPress={onGoToStudents}>
            Go to Students
          </Button>
        </div>
      )}

      {!loading && !error && periodsForDay.length > 0 && allStudents.length > 0 && (
        <div className="mt-2">
          <AttendanceDaySection
            rows={dayStatuses}
            onMarkPresent={markPresent}
            onMarkAbsent={markAbsent}
            onMarkLate={markLate}
            onMarkEarlyPickup={markEarlyPickup}
            onMarkLateArrival={markLateArrival}
            onMarkBulk={markDayStatusBulk}
          />
        </div>
      )}
    </div>
  );
}
