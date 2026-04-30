import { Users, CalendarRange, School, GraduationCap } from "lucide-react";
import { useTranslation } from "../i18n/LanguageContext";
import type { Group } from "../types/group";

interface GroupCardProps {
  group: Group;
  isSelected: boolean;
  onClick: () => void;
}

function formatMonthYear(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(dateStr + "T12:00:00"));
}

function getActiveStatus(startDate: string | null | undefined, endDate: string | null | undefined): "active" | "inactive" | null {
  if (!startDate && !endDate) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const start = startDate ? new Date(startDate + "T12:00:00") : null;
  const end = endDate ? new Date(endDate + "T12:00:00") : null;
  const afterStart = start ? today >= start : true;
  const beforeEnd = end ? today <= end : true;
  return afterStart && beforeEnd ? "active" : "inactive";
}

export function GroupCard({ group, isSelected, onClick }: GroupCardProps) {
  const { t } = useTranslation();
  const start = formatMonthYear(group.start_date);
  const end = formatMonthYear(group.end_date);
  const dateRange = start && end ? `${start} – ${end}` : start || end || null;
  const status = getActiveStatus(group.start_date, group.end_date);

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-2xl border p-5 transition-all ${
        isSelected
          ? "border-accent bg-accent/5 shadow-md shadow-accent/10"
          : "border-border bg-background hover:border-accent/40 hover:shadow-md hover:shadow-black/5"
      }`}
    >
      {/* Header: name + student count */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base text-foreground leading-tight truncate">{group.name}</h3>
          {group.school_name && (
            <span className="flex items-center gap-1 mt-1 text-xs text-foreground/50">
              <School size={11} />
              {group.school_name}
            </span>
          )}
        </div>
        <span className="shrink-0 flex items-center gap-1 text-xs text-foreground/50 mt-0.5">
          <Users size={12} />
          {group.student_count}
        </span>
      </div>

      {/* Footer rows */}
      <div className="flex flex-col gap-1.5">
        {group.grade && (
          <span className="flex items-center gap-1.5 text-xs text-foreground/50">
            <GraduationCap size={12} />
            {t(`groups.addGroupModal.grades.${group.grade}`)} {t("groups.card.grade")}
          </span>
        )}
        {dateRange && (
          <span className="flex items-center gap-1.5 text-xs text-foreground/50">
            <CalendarRange size={12} />
            {dateRange}
          </span>
        )}
        {status && (
          <div className="mt-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              status === "active"
                ? "bg-success/15 text-success"
                : "bg-foreground/8 text-foreground/40"
            }`}>
              {status === "active" ? t("groups.card.active") : t("groups.card.inactive")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
