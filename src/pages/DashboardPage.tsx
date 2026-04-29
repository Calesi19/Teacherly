import { useMemo } from "react";
import {
  Users,
  CalendarDays,
  ClipboardCheck,
  BookOpen,
  Pencil,
  BarChart2,
  AlertCircle,
  CalendarHeart,
  ShieldAlert,
  Stethoscope,
} from "lucide-react";
import { Breadcrumb } from "../components/Breadcrumb";
import { useTranslation } from "../i18n/LanguageContext";
import { useDashboardData } from "../hooks/useDashboardData";
import type { Group } from "../types/group";

interface DashboardPageProps {
  group: Group;
  onGoToGroups: () => void;
  onGoToStudents: () => void;
  onGoToSchedule: () => void;
  onGoToAttendance: () => void;
  onGoToAssignments: () => void;
  onGoToEditGroup: () => void;
  onGoToReports: () => void;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(isoDate: string): string {
  const d = parseLocalDate(isoDate);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface BirthdayInfo {
  student_id: number;
  name: string;
  birthdate: string;
  upcomingDate: Date;
  currentAge: number;
  nextAge: number;
}

function computeUpcomingBirthdays(
  students: { id: number; name: string; birthdate: string | null }[],
  today: Date
): BirthdayInfo[] {
  const results: BirthdayInfo[] = [];
  const todayYear = today.getFullYear();

  for (const s of students) {
    if (!s.birthdate) continue;
    const birth = parseLocalDate(s.birthdate);
    const bMonth = birth.getMonth();
    const bDay = birth.getDate();

    let upcoming = new Date(todayYear, bMonth, bDay);
    if (upcoming < today) upcoming = new Date(todayYear + 1, bMonth, bDay);

    const diff = daysBetween(today, upcoming);
    if (diff > 30) continue;

    const currentAge =
      todayYear -
      birth.getFullYear() -
      (today < new Date(todayYear, bMonth, bDay) ? 1 : 0);

    results.push({
      student_id: s.id,
      name: s.name,
      birthdate: s.birthdate,
      upcomingDate: upcoming,
      currentAge,
      nextAge: currentAge + 1,
    });
  }

  return results.sort((a, b) => a.upcomingDate.getTime() - b.upcomingDate.getTime());
}

// ─── sub-components ──────────────────────────────────────────────────────────

function DashboardCard({
  icon,
  label,
  description,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <button
      onClick={onPress}
      className="flex flex-col gap-3 p-5 rounded-xl bg-surface border border-border hover:border-accent/40 hover:bg-accent/5 transition-colors text-left cursor-pointer"
    >
      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-sm">{label}</p>
        <p className="text-xs text-muted mt-0.5">{description}</p>
      </div>
    </button>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-surface border border-border p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {icon && <span className="text-accent">{icon}</span>}
        <span className="text-sm font-semibold">{title}</span>
      </div>
      {children}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export function DashboardPage({
  group,
  onGoToGroups,
  onGoToStudents,
  onGoToSchedule,
  onGoToAttendance,
  onGoToAssignments,
  onGoToEditGroup,
  onGoToReports,
}: DashboardPageProps) {
  const { t } = useTranslation();
  const { students, ungradedItems, periodCount, loading } = useDashboardData(group.id);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // ── computed stats ─────────────────────────────────────────────────────────

  const maleCount = students.filter(
    (s) => s.gender?.toLowerCase() === "male" || s.gender?.toLowerCase() === "masculino"
  ).length;
  const femaleCount = students.filter(
    (s) => s.gender?.toLowerCase() === "female" || s.gender?.toLowerCase() === "femenino"
  ).length;
  const specialEdCount = students.filter((s) => s.has_special_education === 1).length;

  // ── group progress ─────────────────────────────────────────────────────────

  const progress = useMemo(() => {
    if (!group.start_date || !group.end_date) return null;
    const start = parseLocalDate(group.start_date);
    const end = parseLocalDate(group.end_date);
    const total = daysBetween(start, end);
    if (total <= 0) return null;
    const elapsed = Math.max(0, Math.min(total, daysBetween(start, today)));
    const daysLeft = Math.max(0, daysBetween(today, end));
    const pct = Math.round((elapsed / total) * 100);
    return { elapsed, total, daysLeft, pct, ended: today > end };
  }, [group.start_date, group.end_date, today]);

  // ── birthdays ──────────────────────────────────────────────────────────────

  const upcomingBirthdays = useMemo(
    () => computeUpcomingBirthdays(students, today),
    [students, today]
  );

  // ── allergies ──────────────────────────────────────────────────────────────

  const allergyList = useMemo(
    () =>
      students
        .filter((s) => s.allergies && s.allergies.trim().length > 0)
        .map((s) => ({ name: s.name, allergies: s.allergies! })),
    [students]
  );

  // ── action needed ──────────────────────────────────────────────────────────

  const actionItems = useMemo(() => {
    const items: { key: string; label: string; onClick?: () => void }[] = [];

    if (students.length === 0) {
      items.push({
        key: "no-students",
        label: t("dashboard.actionAddStudents"),
        onClick: onGoToStudents,
      });
    }

    if (periodCount === 0) {
      items.push({
        key: "no-schedule",
        label: t("dashboard.actionAddSchedule"),
        onClick: onGoToSchedule,
      });
    }

    const missingBirthday = students.filter((s) => !s.birthdate).length;
    if (missingBirthday > 0) {
      items.push({
        key: "missing-birthday",
        label: t("dashboard.actionMissingBirthday", { count: missingBirthday }),
        onClick: onGoToStudents,
      });
    }

    const byAssignment = new Map<number, { title: string; count: number }>();
    for (const row of ungradedItems) {
      const existing = byAssignment.get(row.assignment_id);
      if (existing) {
        existing.count++;
      } else {
        byAssignment.set(row.assignment_id, { title: row.title, count: 1 });
      }
    }
    for (const [id, { title, count }] of byAssignment) {
      items.push({
        key: `ungraded-${id}`,
        label: t("dashboard.actionUngradedAssignment", { title, count }),
        onClick: onGoToAssignments,
      });
    }

    return items;
  }, [students, periodCount, ungradedItems, t, onGoToStudents, onGoToSchedule, onGoToAssignments]);

  // ── render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center px-6 py-6 pl-3">
        <span className="text-muted text-sm">Loading…</span>
      </div>
    );
  }

  const navCards = [
    {
      id: "students",
      icon: <Users size={20} />,
      label: t("sidebar.students"),
      description: t("dashboard.studentsDescription"),
      onPress: onGoToStudents,
    },
    {
      id: "schedule",
      icon: <CalendarDays size={20} />,
      label: t("sidebar.schedule"),
      description: t("dashboard.scheduleDescription"),
      onPress: onGoToSchedule,
    },
    {
      id: "attendance",
      icon: <ClipboardCheck size={20} />,
      label: t("sidebar.attendance"),
      description: t("dashboard.attendanceDescription"),
      onPress: onGoToAttendance,
    },
    {
      id: "assignments",
      icon: <BookOpen size={20} />,
      label: t("sidebar.assignments"),
      description: t("dashboard.assignmentsDescription"),
      onPress: onGoToAssignments,
    },
    {
      id: "reports",
      icon: <BarChart2 size={20} />,
      label: t("sidebar.reports"),
      description: t("dashboard.reportsDescription"),
      onPress: onGoToReports,
    },
    {
      id: "edit-group",
      icon: <Pencil size={20} />,
      label: t("dashboard.editGroup"),
      description: t("dashboard.editGroupDescription"),
      onPress: onGoToEditGroup,
    },
  ];

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-6 py-6 pl-3">
      {/* Header */}
      <div>
        <Breadcrumb
          items={[
            { label: t("groups.breadcrumb"), onClick: onGoToGroups },
            { label: group.name },
          ]}
        />
        <h2 className="text-2xl font-bold mt-1">{group.name}</h2>
        {(group.school_name || group.grade) && (
          <p className="text-sm text-muted mt-0.5">
            {[group.school_name, group.grade].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      {/* Nav cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {navCards.map((card) => (
          <DashboardCard
            key={card.id}
            icon={card.icon}
            label={card.label}
            description={card.description}
            onPress={card.onPress}
          />
        ))}
      </div>

      {/* Progress bar */}
      {progress && (
        <div className="rounded-xl bg-surface border border-border p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{t("dashboard.progressBar")}</span>
            <span className="text-xs text-muted">
              {progress.ended
                ? t("dashboard.groupEnded")
                : t("dashboard.daysLeft", { count: progress.daysLeft })}
            </span>
          </div>
          <div className="h-3 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
          <span className="text-xs text-muted">
            {t("dashboard.daysElapsed", { elapsed: progress.elapsed, total: progress.total })}
            {" · "}
            {progress.pct}%
          </span>
        </div>
      )}

      {/* Stats row */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5 rounded-lg bg-surface border border-border px-3 py-2 text-sm">
          <span className="font-semibold text-accent">{students.length}</span>
          <span className="text-muted">{t("dashboard.totalStudents")}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-surface border border-border px-3 py-2 text-sm">
          <span className="font-semibold text-accent">{femaleCount}</span>
          <span className="text-muted">{t("dashboard.female")}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-surface border border-border px-3 py-2 text-sm">
          <span className="font-semibold text-accent">{maleCount}</span>
          <span className="text-muted">{t("dashboard.male")}</span>
        </div>
        {specialEdCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg bg-surface border border-border px-3 py-2 text-sm">
            <span className="font-semibold text-accent">{specialEdCount}</span>
            <span className="text-muted">{t("dashboard.specialEd")}</span>
          </div>
        )}
      </div>

      {/* Info row: birthdays + allergies + action needed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming birthdays */}
        <SectionCard
          title={t("dashboard.upcomingBirthdays")}
          icon={<CalendarHeart size={16} />}
        >
          {upcomingBirthdays.length === 0 ? (
            <p className="text-xs text-muted italic">{t("dashboard.noBirthdays")}</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {upcomingBirthdays.map((b) => (
                <div key={b.student_id} className="py-2 flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{b.name}</span>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span>{formatDate(b.birthdate)}</span>
                    <span>·</span>
                    <span>
                      {t("dashboard.ageLabel", {
                        current: b.currentAge,
                        next: b.nextAge,
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Action Needed */}
        <SectionCard
          title={t("dashboard.actionNeeded")}
          icon={<ShieldAlert size={16} />}
        >
          {actionItems.length === 0 ? (
            <p className="text-xs text-muted italic">{t("dashboard.allClear")}</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {actionItems.map((item) => (
                <button
                  key={item.key}
                  onClick={item.onClick}
                  className={`flex items-start gap-2 py-2.5 text-left transition-colors ${
                    item.onClick
                      ? "hover:text-accent cursor-pointer"
                      : "cursor-default"
                  }`}
                >
                  <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                  <span className="text-sm">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Allergies — only shown when data exists */}
      {allergyList.length > 0 && (
        <SectionCard
          title={t("dashboard.allergies")}
          icon={<Stethoscope size={16} />}
        >
          <div className="flex flex-col divide-y divide-border">
            {allergyList.map((a) => (
              <div key={a.name} className="py-2 flex flex-col gap-0.5">
                <span className="text-sm font-medium">{a.name}</span>
                <span className="text-xs text-muted">{a.allergies}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
