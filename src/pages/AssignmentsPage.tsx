import { useState, useMemo } from "react";
import { Inbox, Trash2 } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Breadcrumb } from "../components/Breadcrumb";
import { ConfirmModal } from "../components/ConfirmModal";
import { AddAssignmentModal } from "../components/AddAssignmentModal";
import { useAssignments } from "../hooks/useAssignments";
import { useTranslation } from "../i18n/LanguageContext";
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
    <div className="flex h-full flex-col px-6 pt-6 pb-6 pl-3">
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
            <div className="min-h-0 flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("assignments.tableColumns.title")}</TableHead>
                    <TableHead>{t("assignments.tableColumns.type")}</TableHead>
                    <TableHead>
                      {t("assignments.tableColumns.period")}
                    </TableHead>
                    <TableHead>
                      {t("assignments.tableColumns.maxScore")}
                    </TableHead>
                    <TableHead>{t("assignments.tableColumns.date")}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
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
                        {assignment.period_name}
                      </TableCell>
                      <TableCell className="text-sm text-foreground/50">
                        {assignment.max_score} {t("assignments.pts")}
                      </TableCell>
                      <TableCell className="text-sm text-foreground/50">
                        {formatDate(assignment.created_at)}
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
              </Table>

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
