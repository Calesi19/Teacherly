import { useState } from "react";
import { Button, Spinner } from "@heroui/react";
import { CalendarDays } from "lucide-react";
import { useAttendance } from "../hooks/useAttendance";
import { Breadcrumb } from "../components/Breadcrumb";
import { DateNavigator } from "../components/DateNavigator";
import { AttendancePeriodSection } from "../components/AttendancePeriodSection";
import type { Classroom } from "../types/classroom";

interface AttendancePageProps {
  classroom: Classroom;
  onGoToClassrooms: () => void;
  onGoToStudents: () => void;
  onGoToSchedule: () => void;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function AttendancePage({
  classroom,
  onGoToClassrooms,
  onGoToStudents,
  onGoToSchedule,
}: AttendancePageProps) {
  const [date, setDate] = useState(todayStr);
  const {
    periodsForDay,
    attendanceByPeriod,
    allStudents,
    loading,
    error,
    setStatus,
    setStatusBulk,
    markEarlyPickup,
  } = useAttendance(classroom.id, date);

  return (
    <div className="p-6 flex flex-col h-full">
      <Breadcrumb
        items={[
          { label: "Classrooms", onClick: onGoToClassrooms },
          { label: classroom.name, onClick: onGoToStudents },
          { label: "Attendance" },
        ]}
      />

      <div className="flex items-start justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold">Attendance</h2>
          <p className="text-sm text-muted">
            {classroom.subject && <span>{classroom.subject} · </span>}
            {classroom.grade && <span>{classroom.grade}</span>}
          </p>
        </div>
        <Button variant="ghost" size="sm" onPress={onGoToSchedule}>
          <CalendarDays size={15} className="mr-1" />
          Schedule
        </Button>
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
          <Button variant="ghost" size="sm" onPress={onGoToStudents}>Go to Students</Button>
        </div>
      )}

      {!loading && !error && periodsForDay.length > 0 && allStudents.length > 0 && (
        <div className="flex flex-col gap-4 mt-2">
          {periodsForDay.map((period) => (
            <AttendancePeriodSection
              key={period.id}
              period={period}
              rows={attendanceByPeriod.get(period.id) ?? []}
              onSetStatus={(studentId, periodId, status) =>
                setStatus(studentId, periodId, status)
              }
              onSetStatusBulk={(studentIds, periodId, status) =>
                setStatusBulk(studentIds, periodId, status)
              }
              onMarkEarlyPickup={(studentId, periodId) =>
                markEarlyPickup(studentId, periodId)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
