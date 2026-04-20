import { useState, useEffect } from "react";
import { Chip, Spinner, Surface } from "@heroui/react";
import { Breadcrumb } from "../components/Breadcrumb";
import { useAssignmentDetail } from "../hooks/useAssignmentDetail";
import { useTranslation } from "../i18n/LanguageContext";
import type { Group } from "../types/group";
import type { Assignment, GradeBand } from "../types/assignment";

interface AssignmentDetailPageProps {
  assignment: Assignment;
  group: Group;
  onGoToGroups: () => void;
  onGoToStudents: () => void;
  onGoToAssignments: () => void;
}

const BAND_COLORS: Record<GradeBand, { bar: string; text: string }> = {
  A: { bar: "bg-success", text: "text-success" },
  B: { bar: "bg-accent", text: "text-accent" },
  C: { bar: "bg-warning", text: "text-warning" },
  D: { bar: "bg-warning/60", text: "text-warning" },
  F: { bar: "bg-danger", text: "text-danger" },
};

export function AssignmentDetailPage({
  assignment,
  group,
  onGoToGroups,
  onGoToStudents,
  onGoToAssignments,
}: AssignmentDetailPageProps) {
  const { scores, loading, error, upsertScore, stats } = useAssignmentDetail(
    assignment.id,
    group.id,
    assignment.max_score
  );
  const { t } = useTranslation();

  const [pendingScores, setPendingScores] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    setPendingScores(new Map());
  }, [scores]);

  const getDisplayValue = (studentId: number, dbScore: number | null): string => {
    if (pendingScores.has(studentId)) return pendingScores.get(studentId)!;
    return dbScore !== null ? String(dbScore) : "";
  };

  const handleChange = (studentId: number, value: string) => {
    setPendingScores((prev) => {
      const next = new Map(prev);
      next.set(studentId, value);
      return next;
    });
  };

  const handleBlur = async (studentId: number, value: string) => {
    const trimmed = value.trim();
    const parsed = trimmed === "" ? null : parseFloat(trimmed);
    if (parsed !== null && isNaN(parsed)) return;
    await upsertScore(studentId, parsed);
  };

  return (
    <div className="p-6">
      <Breadcrumb
        items={[
          { label: t("groups.breadcrumb"), onClick: onGoToGroups },
          { label: group.name, onClick: onGoToStudents },
          { label: t("assignments.breadcrumb"), onClick: onGoToAssignments },
          { label: assignment.title },
        ]}
      />

      <div className="mb-6">
        <h2 className="text-2xl font-bold">{assignment.title}</h2>
        <p className="text-sm text-muted mt-0.5">
          {assignment.period_name} · {assignment.max_score} {t("assignmentDetail.ptsMax")}
        </p>
      </div>

      {assignment.description && (
        <Surface variant="secondary" className="rounded-2xl p-4 mb-6">
          <p className="text-sm text-foreground/80 whitespace-pre-wrap">{assignment.description}</p>
        </Surface>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" color="accent" />
        </div>
      ) : error ? (
        <div role="alert" className="rounded-lg bg-danger/10 text-danger px-4 py-3 text-sm mb-6">
          {error}
        </div>
      ) : (
        <>
          {stats.gradedCount > 0 && (
            <Surface variant="secondary" className="rounded-2xl p-5 mb-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted uppercase tracking-wide">{t("assignmentDetail.average")}</span>
                  <span className="text-2xl font-bold">
                    {stats.average !== null ? stats.average.toFixed(1) : "—"}
                    <span className="text-sm font-normal text-muted ml-1">
                      / {assignment.max_score}
                    </span>
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted uppercase tracking-wide">{t("assignmentDetail.graded")}</span>
                  <span className="text-2xl font-bold">
                    {stats.gradedCount}
                    <span className="text-sm font-normal text-muted ml-1">
                      / {scores.length} {scores.length !== 1 ? t("assignmentDetail.studentsSuffix") : t("assignmentDetail.studentSuffix")}
                    </span>
                  </span>
                </div>
              </div>

              {stats.distribution.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex rounded-full overflow-hidden h-3">
                    {stats.distribution.map((d) => (
                      <div
                        key={d.band}
                        className={`${BAND_COLORS[d.band].bar} h-full`}
                        style={{ width: `${d.percentage}%` }}
                        title={`${d.band}: ${d.count} ${d.count !== 1 ? t("assignmentDetail.studentsSuffix") : t("assignmentDetail.studentSuffix")}`}
                      />
                    ))}
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    {stats.distribution.map((d) => (
                      <div key={d.band} className="flex items-center gap-1">
                        <span className={`text-xs font-semibold ${BAND_COLORS[d.band].text}`}>
                          {d.band}
                        </span>
                        <span className="text-xs text-muted">
                          {d.count} ({Math.round(d.percentage)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Surface>
          )}

          <div className="flex flex-col gap-2">
            {scores.map((row) => {
              const displayVal = getDisplayValue(row.student_id, row.score);
              const isExtraCredit =
                row.score !== null && row.score > assignment.max_score;

              return (
                <div
                  key={row.student_id}
                  className="rounded-xl bg-background px-4 py-3 flex items-center justify-between gap-4 border border-border/60"
                >
                  <span className="text-sm font-medium flex-1 truncate">{row.student_name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {isExtraCredit && (
                      <Chip size="sm" color="warning" variant="secondary">
                        EC
                      </Chip>
                    )}
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="—"
                      value={displayVal}
                      onChange={(e) => handleChange(row.student_id, e.target.value)}
                      onBlur={(e) => handleBlur(row.student_id, e.target.value)}
                      className="w-20 flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <span className="text-xs text-muted">/ {assignment.max_score}</span>
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
