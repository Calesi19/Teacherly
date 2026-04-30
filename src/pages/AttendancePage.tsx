import { useState } from "react";
import { ArrowLeftRight, CalendarDays, CalendarX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppDatePicker } from "@/components/ui/app-date-picker";

import { useAttendance } from "../hooks/useAttendance";
import { Breadcrumb } from "../components/Breadcrumb";
import { AttendanceDaySection } from "../components/AttendanceDaySection";
import { ConfirmModal } from "../components/ConfirmModal";
import { useTranslation } from "../i18n/LanguageContext";
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

function clampDate(date: string, min: string | null, max: string | null) {
  if (min && date < min) return min;
  if (max && date > max) return max;
  return date;
}

export function AttendancePage({
  group,
  onGoToGroups,
  onGoToStudents,
  onGoToSchedule,
}: AttendancePageProps) {
  const [date, setDate] = useState(() =>
    clampDate(todayStr(), group.start_date, group.end_date),
  );
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const { t } = useTranslation();
  const {
    periodsForDay,
    allStudents,
    dayStatuses,
    isCanceled,
    loading,
    error,
    markPresent,
    markAbsent,
    markLate,
    markPartial,
    markDayStatusBulk,
    cancelDay,
    uncancelDay,
  } = useAttendance(group.id, date);

  const withPastDateConfirm = (action: () => void) => {
    if (date < todayStr()) {
      setPendingAction(() => action);
    } else {
      action();
    }
  };

  const isToday = date === todayStr();
  const today = todayStr();
  const isTodayInRange =
    (!group.start_date || today >= group.start_date) &&
    (!group.end_date || today <= group.end_date);

  return (
    <div className="flex h-full flex-col px-6 pt-8 pb-6 pl-3">
      <Breadcrumb
        items={[
          { label: t("groups.breadcrumb"), onClick: onGoToGroups },
          { label: group.name, onClick: onGoToStudents },
          { label: t("attendance.breadcrumb") },
        ]}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("attendance.title")}</h2>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {!isToday && isTodayInRange && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDate(today)}
              className="sm:order-first"
            >
              <ArrowLeftRight size={14} />
              {t("attendance.today")}
            </Button>
          )}
          <AppDatePicker
            value={date}
            onChange={setDate}
            minValue={group.start_date ?? undefined}
            maxValue={group.end_date ?? undefined}
            placeholder={t("attendance.date")}
            className="w-full max-w-sm"
          />
          {!loading &&
            !error &&
            (isCanceled ? (
              <Button variant="secondary" size="sm" onClick={uncancelDay}>
                {t("attendance.restoreDay")}
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => cancelDay()}
                disabled={periodsForDay.length === 0}
              >
                {t("attendance.cancelDay")}
              </Button>
            ))}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg bg-danger/10 text-danger px-4 py-3 text-sm"
        >
          {error}
        </div>
      )}

      {!loading && !error && isCanceled && (
        <div className="flex items-center gap-3 rounded-lg bg-warning/10 text-warning px-4 py-3 text-sm mt-2">
          <CalendarX size={16} className="shrink-0" />
          <span>{t("attendance.canceledBanner")}</span>
        </div>
      )}

      {!loading && !error && !isCanceled && periodsForDay.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 text-center gap-3 mt-8">
          <CalendarDays size={40} className="text-foreground/20" />
          <p className="text-lg font-semibold text-muted">
            {t("attendance.noPeriodsForDay")}
          </p>
          <p className="text-sm text-foreground/40">
            {t("attendance.noPeriodsHint")}
          </p>
          <Button size="sm" onClick={onGoToSchedule}>
            {t("attendance.setUpSchedule")}
          </Button>
        </div>
      )}

      {!loading &&
        !error &&
        !isCanceled &&
        allStudents.length === 0 &&
        periodsForDay.length > 0 && (
          <div className="flex flex-col items-center justify-center flex-1 text-center gap-2 mt-8">
            <p className="text-lg font-semibold text-muted">
              {t("attendance.noStudents")}
            </p>
            <p className="text-sm text-foreground/40">
              {t("attendance.noStudentsHint")}
            </p>
            <Button variant="ghost" size="sm" onClick={onGoToStudents}>
              {t("attendance.goToStudents")}
            </Button>
          </div>
        )}

      {!loading &&
        !error &&
        !isCanceled &&
        periodsForDay.length > 0 &&
        allStudents.length > 0 && (
          <div className="flex min-h-0 flex-1 flex-col">
            <AttendanceDaySection
              rows={dayStatuses}
              onMarkPresent={(id) => withPastDateConfirm(() => markPresent(id))}
              onMarkAbsent={(id) => withPastDateConfirm(() => markAbsent(id))}
              onMarkLate={(id) => withPastDateConfirm(() => markLate(id))}
              onMarkPartial={(id, periodStatuses) =>
                withPastDateConfirm(() => markPartial(id, periodStatuses))
              }
              onMarkBulk={(ids, status) =>
                withPastDateConfirm(() => markDayStatusBulk(ids, status))
              }
            />
          </div>
        )}

      <ConfirmModal
        isOpen={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        onConfirm={() => {
          pendingAction?.();
        }}
        title={t("attendance.pastDateConfirm.title")}
        description={t("attendance.pastDateConfirm.description")}
        confirmLabel={t("attendance.pastDateConfirm.confirmLabel")}
      />
    </div>
  );
}
