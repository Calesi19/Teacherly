import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { SVGProps } from "react";
import Database from "@tauri-apps/plugin-sql";
import { Pencil } from "lucide-react";
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
};

type GenderSummary = {
  male: number;
  female: number;
  total: number;
};

type AllergyEntry = {
  name: string;
  allergies: string;
};

const DAY_ORDER: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];
const GENDER_MALE_COLOR = "#3b82f6";
const GENDER_FEMALE_COLOR = "#ec4899";

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

function MarsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="10" cy="14" r="5" />
      <path d="m14 10 6-6" />
      <path d="M15 4h5v5" />
    </svg>
  );
}

function VenusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="5" />
      <path d="M12 13v8" />
      <path d="M9 18h6" />
    </svg>
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

function normalizeGender(gender: string | null | undefined) {
  if (!gender) return null;

  const normalized = gender.trim().toLowerCase();
  if (normalized === "male" || normalized === "masculino") return "male";
  if (normalized === "female" || normalized === "femenino") return "female";
  return null;
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
      });
      continue;
    }

    existing.count += 1;
    if (!existing.days.includes(period.day_of_week as DayOfWeek)) {
      existing.days.push(period.day_of_week as DayOfWeek);
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

function buildGenderSummary(students: Student[]): GenderSummary {
  return students.reduce<GenderSummary>(
    (summary, student) => {
      summary.total += 1;
      const gender = normalizeGender(student.gender);
      if (gender === "male") summary.male += 1;
      if (gender === "female") summary.female += 1;
      return summary;
    },
    { male: 0, female: 0, total: 0 },
  );
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

      const currentAge =
        nextBirthday.getFullYear() - birthdate.getFullYear() - 1;
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
  const {
    periods,
    loading: loadingSchedule,
    error: scheduleError,
  } = useSchedule(group.id);
  const {
    students,
    loading: loadingStudents,
    error: studentsError,
  } = useStudents(group.id);

  const locale = getLocale(language);
  const courseSummaries = buildCourseSummaries(periods);
  const upcomingBirthdays = buildUpcomingBirthdays(students);
  const genderSummary = useMemo(() => buildGenderSummary(students), [students]);
  const genderTotal = genderSummary.male + genderSummary.female;
  const malePercent =
    genderTotal > 0 ? (genderSummary.male / genderTotal) * 100 : 0;
  const femalePercent =
    genderTotal > 0 ? (genderSummary.female / genderTotal) * 100 : 0;
  const [allergyList, setAllergyList] = useState<AllergyEntry[]>([]);
  const [loadingAllergies, setLoadingAllergies] = useState(true);
  const [allergyError, setAllergyError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchAllergies() {
      try {
        setLoadingAllergies(true);
        const db = await Database.load("sqlite:teacherly.db");
        const rows = await db.select<
          { name: string; allergies: string | null }[]
        >(
          `SELECT s.name, ss.allergies
           FROM students s
           JOIN student_services ss ON ss.student_id = s.id AND ss.is_deleted = 0
           WHERE s.group_id = ? AND s.is_deleted = 0 AND ss.allergies IS NOT NULL AND TRIM(ss.allergies) != ''
           ORDER BY s.name ASC`,
          [group.id],
        );

        if (cancelled) return;
        setAllergyList(
          rows.map((row) => ({
            name: row.name,
            allergies: row.allergies ?? "",
          })),
        );
        setAllergyError(null);
      } catch (error) {
        if (cancelled) return;
        setAllergyError(String(error));
        setAllergyList([]);
      } finally {
        if (!cancelled) setLoadingAllergies(false);
      }
    }

    fetchAllergies();

    return () => {
      cancelled = true;
    };
  }, [group.id]);

  return (
    <div className="flex h-full flex-col overflow-hidden px-6 pt-8 pb-6">
      <Breadcrumb
        items={[
          { label: t("groups.breadcrumb"), onClick: onGoToGroups },
          { label: group.name },
          { label: t("sidebar.group") },
        ]}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <SectionCard className="bg-[color:color-mix(in_srgb,var(--accent)_7%,var(--background)_93%)]">
          <div className="flex flex-row flex-wrap items-center justify-between gap-6">
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="text-sm font-medium text-accent">
                  {t("groups.overview.kicker")}
                </p>
                <h2 className="text-3xl font-bold tracking-tight">
                  {group.name}
                </h2>
              </div>

              <div className="flex flex-wrap gap-2 text-sm text-foreground/70">
                {group.school_name ? (
                  <span className="rounded-full bg-background/70 pr-3 py-1">
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

            <div className="flex shrink-0 items-start gap-4">
              <div className="w-full max-w-[240px] p-1 text-left">
                {genderTotal === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/60 px-3 py-6 text-center text-sm text-foreground/55">
                    {t("groups.overview.noGenderData")}
                  </div>
                ) : (
                  <>
                    <div className="relative mx-auto aspect-[2/1] w-full max-w-[180px]">
                      <svg
                        viewBox="0 0 120 64"
                        className="h-full w-full"
                        aria-label={t("groups.overview.genderTitle")}
                      >
                        <path
                          d="M16 58 A44 44 0 0 1 104 58"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="12"
                          strokeLinecap="round"
                          className="opacity-20"
                          pathLength={100}
                        />
                        <path
                          d="M16 58 A44 44 0 0 1 104 58"
                          fill="none"
                          stroke={GENDER_MALE_COLOR}
                          strokeWidth="12"
                          strokeLinecap="round"
                          pathLength={100}
                          strokeDasharray={`${Math.min(Math.max(malePercent, 0), 100)} 100`}
                        />
                        <path
                          d="M16 58 A44 44 0 0 1 104 58"
                          fill="none"
                          stroke={GENDER_FEMALE_COLOR}
                          strokeWidth="12"
                          strokeLinecap="round"
                          pathLength={100}
                          strokeDasharray={`${Math.min(Math.max(femalePercent, 0), 100)} 100`}
                          strokeDashoffset={`-${Math.min(Math.max(malePercent, 0), 100)}`}
                        />
                        <text
                          x="60"
                          y="47"
                          textAnchor="middle"
                          className="fill-current text-xl font-bold"
                        >
                          {genderSummary.total}
                        </text>
                        <text
                          x="60"
                          y="57"
                          textAnchor="middle"
                          className="fill-current text-[9px] uppercase tracking-wide text-foreground/60"
                        >
                          {t("groups.overview.studentCount")}
                        </text>
                      </svg>
                    </div>
                    <div className="mt-1 flex items-center justify-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <MarsIcon
                          className="size-4 shrink-0"
                          style={{ color: GENDER_MALE_COLOR }}
                        />
                        <span className="font-semibold">
                          {genderSummary.male}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <VenusIcon
                          className="size-4 shrink-0"
                          style={{ color: GENDER_FEMALE_COLOR }}
                        />
                        <span className="font-semibold">
                          {genderSummary.female}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onGoToEditGroup}
                className="h-8 px-2 text-foreground/70 hover:text-foreground"
              >
                <Pencil className="size-4" />
                {t("common.edit")}
              </Button>
            </div>
          </div>
        </SectionCard>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
          <SectionCard className="flex h-full min-h-0 flex-col overflow-hidden">
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
              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
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
                      {t("groups.overview.courseMeetings", {
                        count: course.count,
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard className="flex h-full min-h-0 flex-col overflow-hidden">
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
              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
                {upcomingBirthdays.map(
                  ({ student, nextBirthday, turningAge }) => (
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
                  ),
                )}
              </div>
            )}

            <div className="my-4 border-t border-border/60" />

            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">
                {t("dashboard.allergies")}
              </h3>
              <span className="text-sm text-foreground/55">
                {allergyList.length}
              </span>
            </div>

            {loadingAllergies ? (
              <div className="flex justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              </div>
            ) : allergyError ? (
              <p className="text-sm text-danger">{allergyError}</p>
            ) : allergyList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-foreground/55">
                {t("groups.overview.noAllergies")}
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
                {allergyList.map((entry) => (
                  <div
                    key={entry.name}
                    className="flex items-start justify-between gap-4 rounded-xl border border-border/50 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{entry.name}</p>
                      <p className="truncate text-sm text-foreground/55">
                        {entry.allergies}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
