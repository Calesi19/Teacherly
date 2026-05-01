import { useState, useMemo } from "react";
import { Inbox, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import { Breadcrumb } from "../components/Breadcrumb";
import { ConfirmModal } from "../components/ConfirmModal";
import { AddAssignmentModal } from "../components/AddAssignmentModal";
import { useAssignments } from "../hooks/useAssignments";
import { useTranslation } from "../i18n/LanguageContext";
import { formatScore } from "../lib/formatScore";
import type { Group } from "../types/group";
import type { Assignment, AssignmentTag } from "../types/assignment";

interface AssignmentsPageProps {
  group: Group;
  onGoToGroups: () => void;
  onGoToStudents: () => void;
  onSelectAssignment: (assignment: Assignment) => void;
}

const TAG_OPTIONS: AssignmentTag[] = [
  "Exam",
  "Quiz",
  "Homework",
  "Extra Credit",
  "Project",
];

const COURSE_CHIP_STYLES = [
  "border-transparent bg-sky-100 text-sky-700 dark:bg-sky-500/18 dark:text-sky-200",
  "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/18 dark:text-emerald-200",
  "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/18 dark:text-amber-200",
  "border-transparent bg-rose-100 text-rose-700 dark:bg-rose-500/18 dark:text-rose-200",
  "border-transparent bg-violet-100 text-violet-700 dark:bg-violet-500/18 dark:text-violet-200",
  "border-transparent bg-cyan-100 text-cyan-700 dark:bg-cyan-500/18 dark:text-cyan-200",
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getGradedStatusClass(
  gradedCount: number,
  totalCount: number,
  dateStr: string,
): string {
  if (gradedCount >= totalCount) return "text-foreground/50";

  const assignmentDate = new Date(dateStr);
  const today = new Date();

  assignmentDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - assignmentDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 0) return "text-foreground/50";
  if (diffDays <= 7) return "text-warning";
  return "text-danger";
}

function getCourseChipClass(periodName: string): string {
  const seed = Array.from(periodName).reduce(
    (total, char) => total + char.charCodeAt(0),
    0,
  );
  return COURSE_CHIP_STYLES[seed % COURSE_CHIP_STYLES.length];
}

export function AssignmentsPage({
  group,
  onGoToGroups,
  onGoToStudents,
  onSelectAssignment,
}: AssignmentsPageProps) {
  const { assignments, loading, error, addAssignment, deleteAssignment } =
    useAssignments(group.id);
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [deletingAssignment, setDeletingAssignment] =
    useState<Assignment | null>(null);

  const periods = useMemo(
    () =>
      Array.from(
        new Set(
          assignments
            .map((assignment) => assignment.period_name)
            .filter(Boolean),
        ),
      ).sort(),
    [assignments],
  );

  const filtered = assignments.filter((assignment) => {
    const matchesSearch = assignment.title
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesPeriod =
      selectedPeriod === "all" || assignment.period_name === selectedPeriod;
    const matchesTag = selectedTag === "all" || assignment.tag === selectedTag;
    return matchesSearch && matchesPeriod && matchesTag;
  });

  const tagLabels: Record<string, string> = {
    all: t("assignments.tags.all"),
    Exam: t("assignments.tags.exam"),
    Quiz: t("assignments.tags.quiz"),
    Homework: t("assignments.tags.homework"),
    "Extra Credit": t("assignments.tags.extraCredit"),
    Project: t("assignments.tags.project"),
  };

  return (
    <div className="flex h-full flex-col px-6 pt-8 pb-6">
      <Breadcrumb
        items={[
          { label: t("groups.breadcrumb"), onClick: onGoToGroups },
          { label: group.name, onClick: onGoToStudents },
          { label: t("assignments.breadcrumb") },
        ]}
      />

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{t("assignments.title")}</h2>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!loading && assignments.length > 0 && (
            <>
              <Input
                placeholder={t("assignments.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-40"
              />
              {periods.length > 0 && (
                <Select
                  value={selectedPeriod}
                  onValueChange={(value) => setSelectedPeriod(value ?? "all")}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder={t("assignments.allPeriods")}>
                      {selectedPeriod === "all"
                        ? t("assignments.allPeriods")
                        : selectedPeriod}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("assignments.allPeriods")}
                    </SelectItem>
                    {periods.map((period) => (
                      <SelectItem key={period} value={period}>
                        {period}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select
                value={selectedTag}
                onValueChange={(value) => setSelectedTag(value ?? "all")}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder={t("assignments.tags.all")}>
                    {tagLabels[selectedTag] ?? t("assignments.tags.all")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(["all", ...TAG_OPTIONS] as string[]).map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tagLabels[tag]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

          <AddAssignmentModal groupId={group.id} onAdd={addAssignment} />
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
          className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        {!loading && !error && (
          <div className="flex h-full flex-1 flex-col overflow-hidden rounded-xl border bg-background">
            <div className="shrink-0 border-b border-border/45 bg-[color:var(--table-header)]">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-[40%]" />
                  <col className="w-28" />
                  <col className="w-28" />
                  <col className="w-24" />
                  <col className="w-24" />
                  <col className="w-24" />
                  <col className="w-12" />
                </colgroup>
                <thead>
                  <TableRow>
                    <TableHead className="text-foreground/70">
                      {t("assignments.tableColumns.title")}
                    </TableHead>
                    <TableHead className="text-foreground/70">
                      {t("assignments.tableColumns.type")}
                    </TableHead>
                    <TableHead className="text-foreground/70">
                      {t("assignments.tableColumns.period")}
                    </TableHead>
                    <TableHead className="text-foreground/70">
                      {t("assignments.tableColumns.maxScore")}
                    </TableHead>
                    <TableHead className="text-foreground/70">
                      {t("assignments.tableColumns.graded")}
                    </TableHead>
                    <TableHead className="text-foreground/70">
                      {t("assignments.tableColumns.date")}
                    </TableHead>
                    <TableHead className="text-foreground/70" />
                  </TableRow>
                </thead>
              </table>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-[40%]" />
                  <col className="w-28" />
                  <col className="w-28" />
                  <col className="w-24" />
                  <col className="w-24" />
                  <col className="w-24" />
                  <col className="w-12" />
                </colgroup>
                <TableBody>
                  {filtered.map((assignment) => (
                    <TableRow
                      key={assignment.id}
                      className="cursor-pointer"
                      onClick={() => onSelectAssignment(assignment)}
                    >
                      <TableCell className="font-medium">
                        {assignment.title}
                      </TableCell>
                      <TableCell className="text-sm text-foreground/50">
                        {tagLabels[assignment.tag] ?? assignment.tag}
                      </TableCell>
                      <TableCell className="text-sm text-foreground/50">
                        <Badge
                          className={`px-2.5 py-1 ${getCourseChipClass(assignment.period_name)}`}
                        >
                          <span>{assignment.period_name}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-foreground/50">
                        {formatScore(assignment.max_score)}{" "}
                        {t("assignments.pts")}
                      </TableCell>
                      <TableCell
                        className={`text-sm ${getGradedStatusClass(assignment.graded_count, assignment.student_count, assignment.assigned_date)}`}
                      >
                        {assignment.graded_count} / {assignment.student_count}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-foreground/50">
                        {formatDate(assignment.assigned_date)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingAssignment(assignment)}
                          aria-label={t("assignments.deleteModal.title")}
                          className="p-1.5 text-foreground/30 hover:text-danger"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </table>

              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <Inbox className="size-6 text-muted" />
                  <span className="text-sm font-medium text-muted">
                    {assignments.length === 0
                      ? t("assignments.noAssignmentsYet")
                      : t("students.noResultsTitle")}
                  </span>
                  <span className="text-xs text-foreground/40">
                    {assignments.length === 0
                      ? t("assignments.noAssignmentsHint")
                      : t("students.noResultsHint", { search })}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deletingAssignment !== null}
        onClose={() => setDeletingAssignment(null)}
        onConfirm={async () => {
          if (deletingAssignment) await deleteAssignment(deletingAssignment.id);
        }}
        title={t("assignments.deleteModal.title")}
        description={
          deletingAssignment
            ? t("assignments.deleteModal.description", {
                title: deletingAssignment.title,
              })
            : ""
        }
        confirmLabel={t("common.delete")}
      />
    </div>
  );
}
