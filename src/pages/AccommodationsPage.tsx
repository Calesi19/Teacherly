import { useState, useEffect } from "react";
import { Button, Spinner } from "@heroui/react";
import { useStudentAccommodations } from "../hooks/useStudentAccommodations";
import { Breadcrumb } from "../components/Breadcrumb";
import { useTranslation } from "../i18n/LanguageContext";
import type { Group } from "../types/group";
import type { Student } from "../types/student";
import type { StudentAccommodationsInput } from "../types/studentAccommodations";

interface AccommodationsPageProps {
  student: Student;
  group: Group;
  onGoToGroups: () => void;
  onGoToStudents: () => void;
  onGoToStudentProfile: () => void;
}

const defaultForm: StudentAccommodationsInput = {
  desk_placement: false,
  extended_time: false,
  shorter_assignments: false,
  use_abacus: false,
  simple_instructions: false,
  visual_examples: false,
};

function SelectCard({
  label,
  sublabel,
  selected,
  onToggle,
}: {
  label: string;
  sublabel?: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`px-4 py-3 rounded-xl border text-left transition-all select-none flex flex-col gap-0.5 ${
        selected
          ? "border-accent bg-accent/10 text-accent"
          : "border-border bg-background text-foreground/70 hover:border-foreground/30 hover:text-foreground"
      }`}
    >
      <span className="text-sm font-medium">{label}</span>
      {sublabel && (
        <span className={`text-xs ${selected ? "text-accent/70" : "text-muted"}`}>{sublabel}</span>
      )}
    </button>
  );
}

export function AccommodationsPage({
  student,
  group,
  onGoToGroups,
  onGoToStudents,
  onGoToStudentProfile,
}: AccommodationsPageProps) {
  const { t } = useTranslation();
  const { data, loading, error, save } = useStudentAccommodations(student.id);
  const [form, setForm] = useState<StudentAccommodationsInput>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setForm({
        desk_placement: data.desk_placement === 1,
        extended_time: data.extended_time === 1,
        shorter_assignments: data.shorter_assignments === 1,
        use_abacus: data.use_abacus === 1,
        simple_instructions: data.simple_instructions === 1,
        visual_examples: data.visual_examples === 1,
      });
    }
  }, [data]);

  const handleSave = async () => {
    setSubmitting(true);
    setSaveError(null);
    try {
      await save(form);
      onGoToStudentProfile();
    } catch (e) {
      setSaveError(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col px-6 pt-8 pb-6 pl-3">
      <Breadcrumb
        items={[
          { label: t("groups.breadcrumb"), onClick: onGoToGroups },
          { label: group.name },
          { label: t("students.breadcrumb"), onClick: onGoToStudents },
          { label: student.name, onClick: onGoToStudentProfile },
          { label: t("accommodationsPage.breadcrumb") },
        ]}
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{t("accommodationsPage.title")}</h2>
          <p className="text-sm text-muted">{student.name}</p>
        </div>
        <Button variant="primary" size="sm" onPress={handleSave} isDisabled={submitting}>
          {submitting ? <Spinner size="sm" /> : t("common.save")}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" color="accent" />
        </div>
      ) : error ? (
        <div role="alert" className="rounded-lg bg-danger/10 text-danger px-4 py-3 text-sm">
          {error}
        </div>
      ) : (
        <div className="flex flex-col gap-4 max-w-2xl">
          <p className="text-sm text-muted">{t("accommodationsPage.instruction")}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <SelectCard
              label={t("accommodationsPage.deskPlacement")}
              sublabel={t("accommodationsPage.deskPlacementSublabel")}
              selected={form.desk_placement}
              onToggle={() => setForm((f) => ({ ...f, desk_placement: !f.desk_placement }))}
            />
            <SelectCard
              label={t("accommodationsPage.extendedTime")}
              sublabel={t("accommodationsPage.extendedTimeSublabel")}
              selected={form.extended_time}
              onToggle={() => setForm((f) => ({ ...f, extended_time: !f.extended_time }))}
            />
            <SelectCard
              label={t("accommodationsPage.shorterAssignments")}
              sublabel={t("accommodationsPage.shorterAssignmentsSublabel")}
              selected={form.shorter_assignments}
              onToggle={() => setForm((f) => ({ ...f, shorter_assignments: !f.shorter_assignments }))}
            />
            <SelectCard
              label={t("accommodationsPage.abacus")}
              sublabel={t("accommodationsPage.abacusSublabel")}
              selected={form.use_abacus}
              onToggle={() => setForm((f) => ({ ...f, use_abacus: !f.use_abacus }))}
            />
            <SelectCard
              label={t("accommodationsPage.simpleInstructions")}
              sublabel={t("accommodationsPage.simpleInstructionsSublabel")}
              selected={form.simple_instructions}
              onToggle={() => setForm((f) => ({ ...f, simple_instructions: !f.simple_instructions }))}
            />
            <SelectCard
              label={t("accommodationsPage.visualExamples")}
              sublabel={t("accommodationsPage.visualExamplesSublabel")}
              selected={form.visual_examples}
              onToggle={() => setForm((f) => ({ ...f, visual_examples: !f.visual_examples }))}
            />
          </div>

          {saveError && (
            <p className="text-danger text-sm">{saveError}</p>
          )}
        </div>
      )}
    </div>
  );
}
