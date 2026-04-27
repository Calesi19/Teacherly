import { useMemo } from "react";
import { Spinner } from "@heroui/react";
import { useSchedule } from "../hooks/useSchedule";
import { Breadcrumb } from "../components/Breadcrumb";
import { AddPeriodModal } from "../components/AddPeriodModal";
import { PeriodCard } from "../components/PeriodCard";
import { useTranslation } from "../i18n/LanguageContext";
import type { SchedulePeriod, DayOfWeek } from "../types/schedule";
import type { Group } from "../types/group";

interface SchedulePageProps {
  group: Group;
  onGoToGroups: () => void;
  onGoToEditGroup: () => void;
}

const ORDERED_DAYS: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];

const SLOT_HEIGHT = 16;
const HOUR_HEIGHT = SLOT_HEIGHT * 4;

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatHourLabel(hour: number): string {
  if (hour === 0 || hour === 24) return "12 AM";
  if (hour === 12) return "12 PM";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

function computeDayLayout(periods: SchedulePeriod[]): Map<number, { lane: number; totalLanes: number }> {
  const result = new Map<number, { lane: number; totalLanes: number }>();
  if (periods.length === 0) return result;

  const sorted = [...periods].sort(
    (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
  );

  function overlaps(a: SchedulePeriod, b: SchedulePeriod): boolean {
    return (
      timeToMinutes(a.start_time) < timeToMinutes(b.end_time) &&
      timeToMinutes(b.start_time) < timeToMinutes(a.end_time)
    );
  }

  const visited = new Set<number>();

  for (const seed of sorted) {
    if (visited.has(seed.id)) continue;

    const cluster: SchedulePeriod[] = [];
    const queue = [seed];
    while (queue.length > 0) {
      const cur = queue.pop()!;
      if (visited.has(cur.id)) continue;
      visited.add(cur.id);
      cluster.push(cur);
      for (const other of sorted) {
        if (!visited.has(other.id) && overlaps(cur, other)) {
          queue.push(other);
        }
      }
    }

    const laneEnds: number[] = [];
    const laneOf = new Map<number, number>();

    for (const p of cluster.sort(
      (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
    )) {
      const start = timeToMinutes(p.start_time);
      let lane = laneEnds.findIndex((end) => end <= start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(0);
      }
      laneEnds[lane] = timeToMinutes(p.end_time);
      laneOf.set(p.id, lane);
    }

    const totalLanes = laneEnds.length;
    for (const p of cluster) {
      result.set(p.id, { lane: laneOf.get(p.id)!, totalLanes });
    }
  }

  return result;
}

export function SchedulePage({
  group,
  onGoToGroups,
  onGoToEditGroup,
}: SchedulePageProps) {
  const { periods, loading, error, addPeriod, updatePeriod, deletePeriod, periodsByDay } =
    useSchedule(group.id);
  const { t } = useTranslation();

  const { gridStartHour, gridStartMin, totalHeight, hours } = useMemo(() => {
    const startMins = periods.map((p) => timeToMinutes(p.start_time));
    const endMins = periods.map((p) => timeToMinutes(p.end_time));
    const start = periods.length > 0 ? Math.max(0, Math.floor(Math.min(...startMins) / 60) - 1) : 7;
    const end = periods.length > 0 ? Math.min(24, Math.ceil(Math.max(...endMins) / 60) + 1) : 18;
    return {
      gridStartHour: start,
      gridStartMin: start * 60,
      totalHeight: (end - start) * HOUR_HEIGHT,
      hours: Array.from({ length: end - start + 1 }, (_, i) => start + i),
    };
  }, [periods]);

  const dayLayouts = useMemo(() => {
    const map = new Map<DayOfWeek, Map<number, { lane: number; totalLanes: number }>>();
    for (const day of ORDERED_DAYS) {
      map.set(day, computeDayLayout(periodsByDay.get(day) ?? []));
    }
    return map;
  }, [periodsByDay]);

  return (
    <div className="p-6 flex flex-col h-full">
      <Breadcrumb
        items={[
          { label: t("groups.breadcrumb"), onClick: onGoToGroups },
          { label: group.name, onClick: onGoToEditGroup },
          { label: t("schedule.breadcrumb") },
        ]}
      />

      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{t("schedule.title")}</h2>
        </div>
        <div className="flex items-center gap-2">
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
          <p className="text-lg font-semibold text-muted">{t("schedule.noScheduleYet")}</p>
          <p className="text-sm text-foreground/40">{t("schedule.noScheduleHint")}</p>
          <AddPeriodModal onAdd={addPeriod} />
        </div>
      )}

      {!loading && !error && periods.length > 0 && (
        <>
          {/* ── Week view (lg+) ── */}
          <div className="hidden lg:flex flex-col flex-1 min-h-0 rounded-xl border border-border/40 overflow-hidden">

            {/* Day header row */}
            <div
              className="grid shrink-0 border-b border-border/40 bg-background-secondary"
              style={{ gridTemplateColumns: "3.5rem repeat(7, 1fr)" }}
            >
              <div />
              {ORDERED_DAYS.map((day) => {
                const dayCount = periodsByDay.get(day)?.length ?? 0;
                return (
                  <div key={day} className="text-center py-2 border-l border-border/30">
                    <span className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                      {t(`schedule.dayShort.${day}`)}
                    </span>
                    {dayCount > 0 && (
                      <span className="block text-foreground/30 text-xs leading-tight">
                        {dayCount} {dayCount !== 1 ? t("schedule.periodPlural") : t("schedule.periodSingular")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Scrollable time grid */}
            <div className="flex-1 overflow-y-auto">
              <div
                className="relative grid"
                style={{ gridTemplateColumns: "3.5rem repeat(7, 1fr)", height: totalHeight }}
              >
                {/* Time gutter */}
                <div className="relative border-r border-border/30">
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="absolute right-2 text-xs text-foreground/40 leading-none -translate-y-1/2"
                      style={{ top: (hour - gridStartHour) * HOUR_HEIGHT }}
                    >
                      {formatHourLabel(hour)}
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {ORDERED_DAYS.map((day) => {
                  const dayPeriods = periodsByDay.get(day) ?? [];
                  const layout = dayLayouts.get(day)!;
                  return (
                    <div key={day} className="relative border-l border-border/20">
                      {/* Hour lines */}
                      {hours.map((hour) => (
                        <div
                          key={hour}
                          className="absolute left-0 right-0 border-t border-border/25"
                          style={{ top: (hour - gridStartHour) * HOUR_HEIGHT }}
                        />
                      ))}
                      {/* Half-hour lines */}
                      {hours.slice(0, -1).map((hour) => (
                        <div
                          key={`hh-${hour}`}
                          className="absolute left-0 right-0 border-t border-border/10"
                          style={{ top: (hour - gridStartHour) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                        />
                      ))}
                      {/* Period blocks */}
                      {dayPeriods.map((period) => {
                        const top =
                          ((timeToMinutes(period.start_time) - gridStartMin) / 15) * SLOT_HEIGHT;
                        const height = Math.max(
                          ((timeToMinutes(period.end_time) - timeToMinutes(period.start_time)) / 15) *
                            SLOT_HEIGHT,
                          SLOT_HEIGHT * 2
                        );
                        const { lane, totalLanes } = layout.get(period.id) ?? { lane: 0, totalLanes: 1 };
                        return (
                          <div
                            key={period.id}
                            className="absolute z-10"
                            style={{
                              top,
                              height,
                              left: `calc(3px + ${lane} * ((100% - 6px) / ${totalLanes}))`,
                              width: `calc((100% - 6px) / ${totalLanes} - 2px)`,
                            }}
                          >
                            <PeriodCard
                              period={period}
                              onDelete={deletePeriod}
                              onEdit={updatePeriod}
                              compact
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── List view (< lg) ── */}
          <div className="lg:hidden flex flex-col gap-6">
            {ORDERED_DAYS.filter((day) => periodsByDay.has(day)).map((day) => {
              const dayCount = periodsByDay.get(day)!.length;
              return (
                <div key={day}>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-foreground/60">
                      {t(`schedule.dayFull.${day}`)}
                    </h3>
                    <span className="text-xs text-foreground/40">
                      ({dayCount} {dayCount !== 1 ? t("schedule.periodPlural") : t("schedule.periodSingular")})
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {periodsByDay.get(day)!.map((period) => (
                      <PeriodCard
                        key={period.id}
                        period={period}
                        onDelete={deletePeriod}
                        onEdit={updatePeriod}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
