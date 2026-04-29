import { useState, useMemo } from "react";
import {
  Button,
  Chip,
  EmptyState,
  Input,
  Spinner,
  TableColumn,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableContent,
  TableScrollContainer,
  TableRoot,
  Select,
  ListBox,
} from "@heroui/react";
import { Inbox, Trash2 } from "lucide-react";
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

const TAG_OPTIONS: AssignmentTag[] = ["Exam", "Quiz", "Homework", "Extra Credit", "Project"];

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
  const { assignments, loading, error, addAssignment, deleteAssignment } = useAssignments(group.id);
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [deletingAssignment, setDeletingAssignment] = useState<Assignment | null>(null);

  const periods = useMemo(
    () => Array.from(new Set(assignments.map((a) => a.period_name).filter(Boolean))).sort(),
    [assignments],
  );

  const filtered = assignments.filter((a) => {
    const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase());
    const matchesPeriod = selectedPeriod === "all" || a.period_name === selectedPeriod;
    const matchesTag = selectedTag === "all" || a.tag === selectedTag;
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
    <div className="p-6 flex flex-col h-full">
      <Breadcrumb
        items={[
          { label: t("groups.breadcrumb"), onClick: onGoToGroups },
          { label: group.name, onClick: onGoToStudents },
          { label: t("assignments.breadcrumb") },
        ]}
      />

      <div className="mb-1">
        <h2 className="text-2xl font-bold">{t("assignments.title")}</h2>
      </div>

      <div className="flex flex-wrap gap-2 mt-4 mb-2">
        {(["all", ...TAG_OPTIONS] as string[]).map((tag) => (
          <Chip
            key={tag}
            variant={selectedTag === tag ? "primary" : "soft"}
            color={selectedTag === tag ? "accent" : "default"}
            className="cursor-pointer transition-transform active:scale-95"
            onClick={() => setSelectedTag(tag)}
          >
            {tagLabels[tag]}
          </Chip>
        ))}
      </div>

      <div className="flex items-center justify-between mt-4 mb-4">
        {!loading && assignments.length > 0 && (
          <div className="flex items-center gap-2">
            <Input
              placeholder={t("assignments.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            {periods.length > 0 && (
              <Select
                aria-label={t("assignments.filterByPeriod")}
                selectedKey={selectedPeriod}
                onSelectionChange={(key) => setSelectedPeriod(String(key ?? "all"))}
                className="w-44"
              >
                <Select.Trigger>
                  <Select.Value>
                    {({ selectedText, isPlaceholder }) =>
                      isPlaceholder ? t("assignments.allPeriods") : selectedText
                    }
                  </Select.Value>
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="all" textValue={t("assignments.allPeriods")}>
                      {t("assignments.allPeriods")}
                    </ListBox.Item>
                    {periods.map((p) => (
                      <ListBox.Item key={p} id={p} textValue={p}>
                        {p}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            )}
          </div>
        )}
        <div className="ml-auto">
          <AddAssignmentModal groupId={group.id} onAdd={addAssignment} />
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

      <div className="flex-1 flex flex-col min-h-0">
        {!loading && !error && (
          <TableRoot variant="primary" className="flex-1 h-full">
            <TableScrollContainer className="h-full">
              <TableContent
                aria-label={t("assignments.title")}
                onRowAction={(key) => {
                  const assignment = assignments.find((a) => a.id === key);
                  if (assignment) onSelectAssignment(assignment);
                }}
              >
                <TableHeader>
                  <TableColumn isRowHeader>
                    {t("assignments.tableColumns.title")}
                  </TableColumn>
                  <TableColumn>
                    {t("assignments.tableColumns.period")}
                  </TableColumn>
                  <TableColumn>
                    {t("assignments.tableColumns.maxScore")}
                  </TableColumn>
                  <TableColumn>
                    {t("assignments.tableColumns.date")}
                  </TableColumn>
                  <TableColumn>{" "}</TableColumn>
                </TableHeader>
                <TableBody
                  renderEmptyState={() => (
                    <EmptyState className="flex h-full w-full flex-col items-center justify-center gap-2 py-12 text-center">
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
                    </EmptyState>
                  )}
                >
                  {filtered.map((a) => (
                    <TableRow key={a.id} id={a.id} className="cursor-pointer">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {a.title}
                          <Chip size="sm" variant="soft" color="default">
                            {tagLabels[a.tag] ?? a.tag}
                          </Chip>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-foreground/50">{a.period_name}</TableCell>
                      <TableCell className="text-sm text-foreground/50">
                        {a.max_score} {t("assignments.pts")}
                      </TableCell>
                      <TableCell className="text-sm text-foreground/50">
                        {formatDate(a.created_at)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onPress={() => setDeletingAssignment(a)}
                          aria-label={t("assignments.deleteModal.title")}
                          className="p-1.5 text-foreground/30 hover:text-danger"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </TableContent>
            </TableScrollContainer>
          </TableRoot>
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
            ? t("assignments.deleteModal.description", { title: deletingAssignment.title })
            : ""
        }
        confirmLabel={t("common.delete")}
      />
    </div>
  );
}
