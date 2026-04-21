import { useState, useEffect } from "react";
import { Button, Spinner, Label, Input } from "@heroui/react";
import { useStudentServices } from "../hooks/useStudentServices";
import { Breadcrumb } from "../components/Breadcrumb";
import type { Group } from "../types/group";
import type { Student } from "../types/student";
import type { StudentServicesInput } from "../types/studentServices";

interface ServicesPageProps {
  student: Student;
  group: Group;
  onGoToGroups: () => void;
  onGoToStudents: () => void;
  onGoToStudentProfile: () => void;
}

const defaultForm: StudentServicesInput = {
  has_special_education: false,
  therapy_speech: false,
  therapy_occupational: false,
  therapy_psychological: false,
  therapy_physical: false,
  medical_plan: "none",
  has_treatment: false,
  allergies: "",
};

function SelectCard({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all select-none ${
        selected
          ? "border-accent bg-accent/10 text-accent"
          : "border-border bg-background text-foreground/60 hover:border-foreground/30 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

export function ServicesPage({
  student,
  group,
  onGoToGroups,
  onGoToStudents,
  onGoToStudentProfile,
}: ServicesPageProps) {
  const { data, loading, error, save } = useStudentServices(student.id);
  const [form, setForm] = useState<StudentServicesInput>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setForm({
        has_special_education: data.has_special_education === 1,
        therapy_speech: data.therapy_speech === 1,
        therapy_occupational: data.therapy_occupational === 1,
        therapy_psychological: data.therapy_psychological === 1,
        therapy_physical: data.therapy_physical === 1,
        medical_plan: data.medical_plan,
        has_treatment: data.has_treatment === 1,
        allergies: data.allergies ?? "",
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
    <div className="p-6 flex flex-col h-full">
      <Breadcrumb
        items={[
          { label: "Groups", onClick: onGoToGroups },
          { label: group.name },
          { label: "Students", onClick: onGoToStudents },
          { label: student.name, onClick: onGoToStudentProfile },
          { label: "Health" },
        ]}
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Health</h2>
          <p className="text-sm text-muted">{student.name}</p>
        </div>
        <Button variant="primary" size="sm" onPress={handleSave} isDisabled={submitting}>
          {submitting ? <Spinner size="sm" /> : "Save"}
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
        <div className="flex flex-col gap-8 max-w-2xl pb-10">
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">Special Education</h3>
            <div className="flex flex-wrap gap-2">
              <SelectCard
                label="Has Special Education Services"
                selected={form.has_special_education}
                onToggle={() => setForm((f) => ({ ...f, has_special_education: !f.has_special_education }))}
              />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">Therapies</h3>
            <div className="flex flex-wrap gap-2">
              <SelectCard
                label="Speech and Language (HL)"
                selected={form.therapy_speech}
                onToggle={() => setForm((f) => ({ ...f, therapy_speech: !f.therapy_speech }))}
              />
              <SelectCard
                label="Occupational (OCUP)"
                selected={form.therapy_occupational}
                onToggle={() => setForm((f) => ({ ...f, therapy_occupational: !f.therapy_occupational }))}
              />
              <SelectCard
                label="Psychological (PSIC)"
                selected={form.therapy_psychological}
                onToggle={() => setForm((f) => ({ ...f, therapy_psychological: !f.therapy_psychological }))}
              />
              <SelectCard
                label="Physical (FIS)"
                selected={form.therapy_physical}
                onToggle={() => setForm((f) => ({ ...f, therapy_physical: !f.therapy_physical }))}
              />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">Medical Insurance</h3>
            <div className="flex flex-wrap gap-2">
              {(["none", "private", "government"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, medical_plan: option }))}
                  className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all select-none ${
                    form.medical_plan === option
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-background text-foreground/60 hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  {option === "none" ? "None" : option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">Treatment</h3>
            <div className="flex flex-wrap gap-2">
              <SelectCard
                label="Currently Receiving Medical Treatment"
                selected={form.has_treatment}
                onToggle={() => setForm((f) => ({ ...f, has_treatment: !f.has_treatment }))}
              />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">Allergies</h3>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="allergies">Known allergies</Label>
              <Input
                id="allergies"
                value={form.allergies}
                onChange={(e) => setForm((f) => ({ ...f, allergies: e.target.value }))}
                placeholder="e.g. Peanuts, Penicillin, Latex"
              />
            </div>
          </section>

          {saveError && (
            <p className="text-danger text-sm">{saveError}</p>
          )}
        </div>
      )}
    </div>
  );
}
