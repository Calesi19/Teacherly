import { useState } from "react";
import { Spinner } from "@heroui/react";
import { BookOpen, Trash2 } from "lucide-react";
import { Breadcrumb } from "../components/Breadcrumb";
import { ConfirmModal } from "../components/ConfirmModal";
import { AddAssignmentModal } from "../components/AddAssignmentModal";
import { useAssignments } from "../hooks/useAssignments";
import { useTranslation } from "../i18n/LanguageContext";
import type { Group } from "../types/group";
import type { Assignment } from "../types/assignment";

interface AssignmentsPageProps {
  group: Group;
  onGoToGroups: () => void;
  onGoToStudents: () => void;
  onSelectAssignment: (assignment: Assignment) => void;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function AssignmentCard({
  assignment,
  onSelect,
  onDelete,
}: {
  assignment: Assignment;
  onSelect: () => void;
  onDelete: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="rounded-2xl bg-background p-4 flex items-center gap-4 border border-border/60">
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 flex items-center justify-between gap-4 text-left min-w-0"
      >
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-medium text-sm truncate">{assignment.title}</span>
          <span className="text-xs text-muted truncate">
            {assignment.period_name} · {formatDate(assignment.created_at)}
          </span>
        </div>
        <span className="text-sm text-foreground/60 shrink-0">{assignment.max_score} {t("assignments.pts")}</span>
      </button>

      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="p-1.5 rounded text-foreground/30 hover:text-danger transition-colors shrink-0"
        aria-label={t("assignments.deleteModal.title")}
      >
        <Trash2 size={14} />
      </button>

      <ConfirmModal
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={onDelete}
        title={t("assignments.deleteModal.title")}
        description={t("assignments.deleteModal.description", { title: assignment.title })}
        confirmLabel={t("common.delete")}
      />
    </div>
  );
}

export function AssignmentsPage({
  group,
  onGoToGroups,
  onGoToStudents,
  onSelectAssignment,
}: AssignmentsPageProps) {
  const { assignments, loading, error, addAssignment, deleteAssignment } = useAssignments(group.id);
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <Breadcrumb
        items={[
          { label: t("groups.breadcrumb"), onClick: onGoToGroups },
          { label: group.name, onClick: onGoToStudents },
          { label: t("assignments.breadcrumb") },
        ]}
      />

      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{t("assignments.title")}</h2>
          {group.grade && (
            <p className="text-sm text-muted mt-0.5">{group.grade}</p>
          )}
        </div>
        <AddAssignmentModal groupId={group.id} onAdd={addAssignment} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" color="accent" />
        </div>
      ) : error ? (
        <div role="alert" className="rounded-lg bg-danger/10 text-danger px-4 py-3 text-sm">
          {error}
        </div>
      ) : assignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <BookOpen size={40} className="text-foreground/20" />
          <p className="text-lg font-semibold text-muted">{t("assignments.noAssignmentsYet")}</p>
          <p className="text-sm text-foreground/40">{t("assignments.noAssignmentsHint")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {assignments.map((a) => (
            <AssignmentCard
              key={a.id}
              assignment={a}
              onSelect={() => onSelectAssignment(a)}
              onDelete={() => deleteAssignment(a.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
