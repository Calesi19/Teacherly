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
import { TabsContent } from "@/components/ui/tabs";
import { useTranslation } from "../../i18n/LanguageContext";
import type { StudentAssignmentPreview } from "../../types/assignment";
import { LoadingSpinner, TableEmptyState } from "./shared";
import { formatShortDate } from "./utils";

interface AssignmentsTabProps {
  assignments: StudentAssignmentPreview[];
  loadingAssignments: boolean;
  filteredAssignments: StudentAssignmentPreview[];
  assignmentSearch: string;
  onAssignmentSearchChange: (value: string) => void;
  assignmentPeriods: string[];
  assignmentPeriodFilter: string;
  onAssignmentPeriodFilterChange: (value: string) => void;
}

export function AssignmentsTab({
  assignments,
  loadingAssignments,
  filteredAssignments,
  assignmentSearch,
  onAssignmentSearchChange,
  assignmentPeriods,
  assignmentPeriodFilter,
  onAssignmentPeriodFilterChange,
}: AssignmentsTabProps) {
  const { t } = useTranslation();

  return (
    <TabsContent value="assignments" className="flex min-h-0 flex-1 flex-col pt-4">
      {loadingAssignments ? (
        <LoadingSpinner large />
      ) : (
        <>
          {assignments.length > 0 ? (
            <div className="mb-4 flex items-center gap-3">
              <Input
                placeholder={t("studentProfile.assignments.searchPlaceholder")}
                value={assignmentSearch}
                onChange={(e) => onAssignmentSearchChange(e.target.value)}
                className="max-w-xs"
              />
              <Select
                value={assignmentPeriodFilter}
                onValueChange={(value) =>
                  onAssignmentPeriodFilterChange(value ?? "all")
                }
              >
                <SelectTrigger className="w-44">
                  <SelectValue
                    placeholder={t("studentProfile.assignments.allPeriods")}
                  >
                    {assignmentPeriodFilter === "all"
                      ? t("studentProfile.assignments.allPeriods")
                      : assignmentPeriodFilter}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("studentProfile.assignments.allPeriods")}
                  </SelectItem>
                  {assignmentPeriods.map((period) => (
                    <SelectItem key={period} value={period}>
                      {period}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-background">
            <div className="min-h-0 flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {t("studentProfile.assignments.columns.assignment")}
                    </TableHead>
                    <TableHead>
                      {t("studentProfile.assignments.columns.period")}
                    </TableHead>
                    <TableHead>
                      {t("studentProfile.assignments.columns.score")}
                    </TableHead>
                    <TableHead>
                      {t("studentProfile.assignments.columns.date")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments.map((assignment) => (
                    <TableRow key={assignment.assignment_id}>
                      <TableCell className="font-medium">
                        {assignment.title}
                      </TableCell>
                      <TableCell className="text-sm text-foreground/50">
                        {assignment.period_name}
                      </TableCell>
                      <TableCell className="text-sm">
                        {assignment.score !== null ? (
                          <span
                            className={
                              assignment.score > assignment.max_score
                                ? "text-warning"
                                : "text-foreground"
                            }
                          >
                            {assignment.score}
                          </span>
                        ) : (
                          <span className="text-foreground/30">—</span>
                        )}
                        <span className="ml-0.5 text-xs text-muted">
                          / {assignment.max_score}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-foreground/50">
                        {formatShortDate(assignment.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredAssignments.length === 0 ? (
                <TableEmptyState
                  title={
                    assignments.length === 0
                      ? t("studentProfile.assignments.noAssignments")
                      : t("studentProfile.assignments.noResults")
                  }
                  hint={
                    assignments.length > 0
                      ? t("studentProfile.assignments.noResultsHint")
                      : undefined
                  }
                />
              ) : null}
            </div>
          </div>
        </>
      )}
    </TabsContent>
  );
}
