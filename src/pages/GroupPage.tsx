import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "../components/Breadcrumb";
import { useSchedule } from "../hooks/useSchedule";
import { useStudents } from "../hooks/useStudents";
import { useTranslation } from "../i18n/LanguageContext";
import type { Group } from "../types/group";
import type { Student } from "../types/student";
import type { DayOfWeek, SchedulePeriod } from "../types/schedule";

interface GroupPageProps {
  group: Group;
  onGoToGroups: () => void;
  onGoToEditGroup: () => void;
  onGoToSchedule: () => void;
}

type CourseSummary = {
  name: string;
  count: number;
  days: DayOfWeek[];
  firstStart: string;
  lastEnd: string;
};

const DAY_ORDER: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];

function SectionCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border bg-background p-5 ${className}`}>
      {children}
    </section>
  );
}

function getLocale(language: "en" | "es") {
  return language === "es" ? "es-PR" : "en-US";
}

function formatDateLabel(value: string, locale: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  });
}

function formatRangeLabel(start: string, end: string, locale: string) {
  return `${formatDateLabel(start, locale)} - ${formatDateLabel(end, locale)}`;
}

function compareTimes(a: string, b: string) {
  return a.localeCompare(b);
}

function buildCourseSummaries(periods: SchedulePeriod[]): CourseSummary[] {
  const byName = new Map<string, CourseSummary>();

  for (const period of periods) {
    const existing = byName.get(period.name);
    if (!existing) {
      byName.set(period.name, {
        name: period.name,
        count: 1,
        days: [period.day_of_week as DayOfWeek],
        firstStart: period.start_time,
        lastEnd: period.end_time,
      });
      continue;
    }

    existing.count += 1;
    if (!existing.days.includes(period.day_of_week as DayOfWeek)) {
      existing.days.push(period.day_of_week as DayOfWeek);
    }
    if (compareTimes(period.start_time, existing.firstStart) < 0) {
      existing.firstStart = period.start_time;
    }
    if (compareTimes(period.end_time, existing.lastEnd) > 0) {
      existing.lastEnd = period.end_time;
    }
  }

  return Array.from(byName.values())
    .map((course) => ({
      ...course,
      days: [...course.days].sort(
        (a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b),
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildUpcomingBirthdays(students: Student[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + 30);

  return students
    .filter((student) => Boolean(student.birthdate))
    .map((student) => {
      const birthdate = new Date(`${student.birthdate}T00:00:00`);
      const nextBirthday = new Date(
        today.getFullYear(),
        birthdate.getMonth(),
        birthdate.getDate(),
      );
      if (nextBirthday < today) {
        nextBirthday.setFullYear(today.getFullYear() + 1);
      }

      const currentAge = nextBirthday.getFullYear() - birthdate.getFullYear() - 1;
      const turningAge = currentAge + 1;

      return {
        student,
        nextBirthday,
        turningAge,
      };
    })
    .filter((entry) => entry.nextBirthday <= cutoff)
    .sort((a, b) => a.nextBirthday.getTime() - b.nextBirthday.getTime())
    .slice(0, 6);
}

export function GroupPage({
  group,
  onGoToGroups,
  onGoToEditGroup,
  onGoToSchedule,
}: GroupPageProps) {
  const { t, language } = useTranslation();
  const { periods, loading: loadingSchedule, error: scheduleError } = useSchedule(
    group.id,
  );
  const { students, loading: loadingStudents, error: studentsError } = useStudents(
    group.id,
  );

  const locale = getLocale(language);
  const courseSummaries = buildCourseSummaries(periods);
  const upcomingBirthdays = buildUpcomingBirthdays(students);

  return (
    <div className="flex h-full flex-col overflow-y-auto px-6 pt-8 pb-6 pl-3">
      <Breadcrumb
        items={[
          { label: t("groups.breadcrumb"), onClick: onGoToGroups },
          { label: group.name },
          { label: t("sidebar.group") },
        ]}
      />

      <div className="flex flex-col gap-4">
        <SectionCard className="bg-[color:color-mix(in_srgb,var(--accent)_7%,var(--background)_93%)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-accent">
                  {t("groups.overview.kicker")}
                </p>
                <h2 className="text-3xl font-bold tracking-tight">{group.name}</h2>
              </div>

              <div className="flex flex-wrap gap-2 text-sm text-foreground/70">
                {group.school_name ? (
                  <span className="rounded-full bg-background/70 px-3 py-1">
                    {group.school_name}
                  </span>
                ) : null}
                {group.grade ? (
                  <span className="rounded-full bg-background/70 px-3 py-1">
                    {t("groups.overview.gradeLabel", { grade: group.grade })}
                  </span>
                ) : null}
                {group.start_date && group.end_date ? (
                  <span className="rounded-full bg-background/70 px-3 py-1">
                    {formatRangeLabel(group.start_date, group.end_date, locale)}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">
              <div className="rounded-2xl border border-border/60 bg-background/75 px-4 py-3 text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("groups.overview.studentCount")}
                </p>
                <p className="text-2xl font-bold">{group.student_count}</p>
              </div>
              <Button onClick={onGoToEditGroup}>{t("dashboard.editGroup")}</Button>
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">
                {t("groups.overview.coursesTitle")}
              </h3>
              <p className="text-sm text-foreground/60">
                {t("groups.overview.coursesDescription")}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onGoToSchedule}>
              {t("groups.editGroup.scheduleManage")}
            </Button>
          </div>

          {loadingSchedule ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          ) : scheduleError ? (
            <p className="text-sm text-danger">{scheduleError}</p>
          ) : courseSummaries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-foreground/55">
              {t("groups.overview.noCourses")}
            </div>
          ) : (
            <div className="space-y-2">
              {courseSummaries.map((course) => (
                <div
                  key={course.name}
                  className="flex flex-col gap-2 rounded-xl border border-border/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{course.name}</p>
                    <p className="text-sm text-foreground/55">
                      {course.days
                        .map((day) => t(`schedule.dayShort.${day}`))
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="text-sm text-foreground/60 sm:text-right">
                    <p>{`${course.firstStart} - ${course.lastEnd}`}</p>
                    <p>
                      {t("groups.overview.courseMeetings", { count: course.count })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard>
          <div className="mb-4">
            <h3 className="text-lg font-semibold">
              {t("dashboard.upcomingBirthdays")}
            </h3>
            <p className="text-sm text-foreground/60">
              {t("groups.overview.birthdaysDescription")}
            </p>
          </div>

          {loadingStudents ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          ) : studentsError ? (
            <p className="text-sm text-danger">{studentsError}</p>
          ) : upcomingBirthdays.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-foreground/55">
              {t("dashboard.noBirthdays")}
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingBirthdays.map(({ student, nextBirthday, turningAge }) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border/50 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{student.name}</p>
                    <p className="text-sm text-foreground/55">
                      {nextBirthday.toLocaleDateString(locale, {
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-sm text-foreground/60">
                    {t("groups.overview.turningAge", { age: turningAge })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
