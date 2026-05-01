import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TabsContent } from "@/components/ui/tabs";
import { useTranslation } from "../../i18n/LanguageContext";
import type { DayAttendanceStatus } from "../../types/attendance";
import type {
  StudentAttendanceDay,
  StudentAttendanceSummary,
} from "../../hooks/useStudentAttendance";
import { LoadingSpinner, TableEmptyState } from "./shared";
import { formatDateFromLocal } from "./utils";

interface AttendanceTabProps {
  loadingAttendance: boolean;
  attendanceDays: StudentAttendanceDay[];
  attendanceSummary: StudentAttendanceSummary;
  attendanceFilter:
    | "totalDays"
    | "present"
    | "absent"
    | "late"
    | "partial"
    | null;
  onAttendanceFilterChange: (
    value: "totalDays" | "present" | "absent" | "late" | "partial" | null,
  ) => void;
  filteredAttendanceDays: StudentAttendanceDay[];
  statusColors: Record<DayAttendanceStatus, string>;
}

export function AttendanceTab({
  loadingAttendance,
  attendanceDays,
  attendanceSummary,
  attendanceFilter,
  onAttendanceFilterChange,
  filteredAttendanceDays,
  statusColors,
}: AttendanceTabProps) {
  const { t } = useTranslation();

  return (
    <TabsContent value="attendance" className="flex min-h-0 flex-1 flex-col gap-4 pt-4">
      {loadingAttendance ? (
        <LoadingSpinner large />
      ) : (
        <>
          {attendanceDays.length > 0 ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {(
                [
                  {
                    key: "totalDays",
                    value: attendanceSummary.totalDays,
                    color: "text-foreground",
                  },
                  {
                    key: "present",
                    value: attendanceSummary.present,
                    color: "text-success",
                  },
                  {
                    key: "absent",
                    value: attendanceSummary.absent,
                    color: "text-danger",
                  },
                  {
                    key: "late",
                    value: attendanceSummary.late,
                    color: "text-warning",
                  },
                  {
                    key: "partial",
                    value: attendanceSummary.partial,
                    color: "text-chart-4",
                  },
                ] as const
              ).map(({ key, value, color }) => {
                const isActive = attendanceFilter === key;
                return (
                  <div
                    key={key}
                    className={cn(
                      "cursor-pointer rounded-lg border bg-background p-3 text-center transition-all select-none hover:ring-1 hover:ring-foreground/10",
                      isActive && "ring-2 ring-foreground/30",
                    )}
                    onClick={() => onAttendanceFilterChange(isActive ? null : key)}
                  >
                    <span className={cn("text-xl font-bold", color)}>{value}</span>
                    <div className="text-xs text-muted-foreground">
                      {t(`studentProfile.attendance.summary.${key}`)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-background">
            <div className="min-h-0 flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("studentProfile.attendance.columns.date")}</TableHead>
                    <TableHead>{t("studentProfile.attendance.columns.status")}</TableHead>
                    <TableHead>{t("studentProfile.attendance.columns.time")}</TableHead>
                    <TableHead>{t("studentProfile.attendance.columns.periods")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendanceDays.map((day) => (
                    <TableRow key={day.date}>
                      <TableCell className="whitespace-nowrap font-medium">
                        {formatDateFromLocal(day.date)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn("text-sm font-medium", statusColors[day.dayStatus])}
                        >
                          {t(`studentProfile.attendance.status.${day.dayStatus}`)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-foreground/50">—</TableCell>
                      <TableCell className="text-sm text-foreground/50">
                        {day.records.map((record) => record.period_name).join(", ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredAttendanceDays.length === 0 ? (
                <TableEmptyState
                  title={t("studentProfile.attendance.noAttendance")}
                  hint={t("studentProfile.attendance.noAttendanceHint")}
                />
              ) : null}
            </div>
          </div>
        </>
      )}
    </TabsContent>
  );
}
