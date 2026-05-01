import { Spinner } from "@heroui/react";
import { BookOpen } from "lucide-react";
import { useSchedule } from "../hooks/useSchedule";
import { Breadcrumb } from "../components/Breadcrumb";
import { AddPeriodModal } from "../components/AddPeriodModal";
import { PeriodCard } from "../components/PeriodCard";
import { useTranslation } from "../i18n/LanguageContext";
import type { Group } from "../types/group";

interface CoursesPageProps {
  group: Group;
  onGoToGroups: () => void;
  onGoToSettings: () => void;
}

export function CoursesPage({
  group,
  onGoToGroups,
  onGoToSettings,
}: CoursesPageProps) {
  const { courses, loading, error, addPeriod, updatePeriod, deletePeriod } =
    useSchedule(group.id);
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col px-6 pt-8 pb-6 pl-3">
      <Breadcrumb
        items={[
          { label: t("groups.breadcrumb"), onClick: onGoToGroups },
          { label: group.name, onClick: onGoToSettings },
          { label: t("schedule.breadcrumb") },
        ]}
      />

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t("schedule.title")}</h2>
          <p className="mt-1 text-sm text-foreground/55">
            {t("schedule.description")}
          </p>
        </div>
        <AddPeriodModal onAdd={addPeriod} />
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" color="accent" />
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {error}
        </div>
      )}

      {!loading && !error && courses.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <BookOpen size={40} className="text-foreground/20" />
          <p className="text-lg font-semibold text-muted">
            {t("schedule.noScheduleYet")}
          </p>
          <p className="text-sm text-foreground/40">
            {t("schedule.noScheduleHint")}
          </p>
          <AddPeriodModal onAdd={addPeriod} />
        </div>
      )}

      {!loading && !error && courses.length > 0 && (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {courses.map((course) => (
            <PeriodCard
              key={course.name}
              course={course}
              onDelete={deletePeriod}
              onEdit={updatePeriod}
            />
          ))}
        </div>
      )}
    </div>
  );
}
