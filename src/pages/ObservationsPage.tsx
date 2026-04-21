import { useState, useEffect } from "react";
import { Button, Spinner } from "@heroui/react";
import { useStudentObservations } from "../hooks/useStudentObservations";
import { Breadcrumb } from "../components/Breadcrumb";
import type { Group } from "../types/group";
import type { Student } from "../types/student";
import type { StudentObservationsInput } from "../types/studentObservations";

interface ObservationsPageProps {
  student: Student;
  group: Group;
  onGoToGroups: () => void;
  onGoToStudents: () => void;
  onGoToStudentProfile: () => void;
}

const defaultForm: StudentObservationsInput = {
  obs_reading_writing: false,
  obs_mirror_numbers: false,
  obs_left_right_confusion: false,
  obs_sequence_difficulty: false,
  obs_disorganized_work: false,
  obs_inattention_detail: false,
  obs_sustained_attention: false,
  obs_doesnt_listen: false,
  obs_task_organization: false,
  obs_loses_belongings: false,
  obs_distracted_stimuli: false,
  obs_forgetful: false,
  obs_excess_hand_foot: false,
  obs_gets_up_from_seat: false,
  obs_running_jumping: false,
  obs_talks_excessively: false,
  obs_difficulty_quiet: false,
  obs_driven_by_motor: false,
  obs_impulsive_answers: false,
  obs_difficulty_waiting: false,
  obs_interrupts_others: false,
  obs_easily_angered: false,
  obs_argues: false,
  obs_defies_adults: false,
  obs_annoys_others: false,
  obs_aggressive: false,
  obs_spiteful: false,
  obs_blames_others: false,
  obs_breaks_property: false,
  obs_incomplete_homework: false,
  obs_frequent_absences: false,
  obs_neglected_appearance: false,
  obs_uses_profanity: false,
  obs_takes_belongings: false,
  obs_forgets_materials: false,
  obs_appears_sad: false,
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
      className={`px-3 py-2.5 rounded-xl border text-sm font-medium text-left transition-all select-none ${
        selected
          ? "border-accent bg-accent/10 text-accent"
          : "border-border bg-background text-foreground/60 hover:border-foreground/30 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

export function ObservationsPage({
  student,
  group,
  onGoToGroups,
  onGoToStudents,
  onGoToStudentProfile,
}: ObservationsPageProps) {
  const { data, loading, error, save } = useStudentObservations(student.id);
  const [form, setForm] = useState<StudentObservationsInput>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setForm({
        obs_reading_writing: data.obs_reading_writing === 1,
        obs_mirror_numbers: data.obs_mirror_numbers === 1,
        obs_left_right_confusion: data.obs_left_right_confusion === 1,
        obs_sequence_difficulty: data.obs_sequence_difficulty === 1,
        obs_disorganized_work: data.obs_disorganized_work === 1,
        obs_inattention_detail: data.obs_inattention_detail === 1,
        obs_sustained_attention: data.obs_sustained_attention === 1,
        obs_doesnt_listen: data.obs_doesnt_listen === 1,
        obs_task_organization: data.obs_task_organization === 1,
        obs_loses_belongings: data.obs_loses_belongings === 1,
        obs_distracted_stimuli: data.obs_distracted_stimuli === 1,
        obs_forgetful: data.obs_forgetful === 1,
        obs_excess_hand_foot: data.obs_excess_hand_foot === 1,
        obs_gets_up_from_seat: data.obs_gets_up_from_seat === 1,
        obs_running_jumping: data.obs_running_jumping === 1,
        obs_talks_excessively: data.obs_talks_excessively === 1,
        obs_difficulty_quiet: data.obs_difficulty_quiet === 1,
        obs_driven_by_motor: data.obs_driven_by_motor === 1,
        obs_impulsive_answers: data.obs_impulsive_answers === 1,
        obs_difficulty_waiting: data.obs_difficulty_waiting === 1,
        obs_interrupts_others: data.obs_interrupts_others === 1,
        obs_easily_angered: data.obs_easily_angered === 1,
        obs_argues: data.obs_argues === 1,
        obs_defies_adults: data.obs_defies_adults === 1,
        obs_annoys_others: data.obs_annoys_others === 1,
        obs_aggressive: data.obs_aggressive === 1,
        obs_spiteful: data.obs_spiteful === 1,
        obs_blames_others: data.obs_blames_others === 1,
        obs_breaks_property: data.obs_breaks_property === 1,
        obs_incomplete_homework: data.obs_incomplete_homework === 1,
        obs_frequent_absences: data.obs_frequent_absences === 1,
        obs_neglected_appearance: data.obs_neglected_appearance === 1,
        obs_uses_profanity: data.obs_uses_profanity === 1,
        obs_takes_belongings: data.obs_takes_belongings === 1,
        obs_forgets_materials: data.obs_forgets_materials === 1,
        obs_appears_sad: data.obs_appears_sad === 1,
      });
    }
  }, [data]);

  const toggle = (key: keyof StudentObservationsInput) =>
    setForm((f) => ({ ...f, [key]: !f[key] }));

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
          { label: "Observations" },
        ]}
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Observations</h2>
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
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">Learning & Dyslexia (Dislexia)</h3>
            <div className="grid grid-cols-2 gap-2">
              <SelectCard label="Difficulty learning to read and write" selected={form.obs_reading_writing} onToggle={() => toggle("obs_reading_writing")} />
              <SelectCard label="Writing numbers in mirror image or backward" selected={form.obs_mirror_numbers} onToggle={() => toggle("obs_mirror_numbers")} />
              <SelectCard label="Difficulty distinguishing left from right" selected={form.obs_left_right_confusion} onToggle={() => toggle("obs_left_right_confusion")} />
              <SelectCard label="Difficulty retaining sequences" selected={form.obs_sequence_difficulty} onToggle={() => toggle("obs_sequence_difficulty")} />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">Attention & Hyperactivity (ADD / ADHD)</h3>
            <div className="grid grid-cols-2 gap-2">
              <SelectCard label="Disorganized in work" selected={form.obs_disorganized_work} onToggle={() => toggle("obs_disorganized_work")} />
              <SelectCard label="Does not pay sufficient attention to detail" selected={form.obs_inattention_detail} onToggle={() => toggle("obs_inattention_detail")} />
              <SelectCard label="Difficulty with sustained attention" selected={form.obs_sustained_attention} onToggle={() => toggle("obs_sustained_attention")} />
              <SelectCard label="Does not seem to listen when spoken to directly" selected={form.obs_doesnt_listen} onToggle={() => toggle("obs_doesnt_listen")} />
              <SelectCard label="Difficulty organizing tasks or activities" selected={form.obs_task_organization} onToggle={() => toggle("obs_task_organization")} />
              <SelectCard label="Loses belongings easily" selected={form.obs_loses_belongings} onToggle={() => toggle("obs_loses_belongings")} />
              <SelectCard label="Distracted by irrelevant stimuli" selected={form.obs_distracted_stimuli} onToggle={() => toggle("obs_distracted_stimuli")} />
              <SelectCard label="Forgetful" selected={form.obs_forgetful} onToggle={() => toggle("obs_forgetful")} />
              <SelectCard label="Excessive movement of hands and feet" selected={form.obs_excess_hand_foot} onToggle={() => toggle("obs_excess_hand_foot")} />
              <SelectCard label="Constantly getting up from seat" selected={form.obs_gets_up_from_seat} onToggle={() => toggle("obs_gets_up_from_seat")} />
              <SelectCard label="Running or jumping in inappropriate situations" selected={form.obs_running_jumping} onToggle={() => toggle("obs_running_jumping")} />
              <SelectCard label="Talking excessively" selected={form.obs_talks_excessively} onToggle={() => toggle("obs_talks_excessively")} />
              <SelectCard label="Difficulty engaging in quiet or passive activities" selected={form.obs_difficulty_quiet} onToggle={() => toggle("obs_difficulty_quiet")} />
              <SelectCard label='Acting as if "driven by a motor"' selected={form.obs_driven_by_motor} onToggle={() => toggle("obs_driven_by_motor")} />
              <SelectCard label="Answering questions impulsively or prematurely" selected={form.obs_impulsive_answers} onToggle={() => toggle("obs_impulsive_answers")} />
              <SelectCard label="Difficulty waiting in lines" selected={form.obs_difficulty_waiting} onToggle={() => toggle("obs_difficulty_waiting")} />
              <SelectCard label="Interrupting or intruding on others' activities" selected={form.obs_interrupts_others} onToggle={() => toggle("obs_interrupts_others")} />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">Social & Oppositional (Oposicional / Social)</h3>
            <div className="grid grid-cols-2 gap-2">
              <SelectCard label="Easily angered" selected={form.obs_easily_angered} onToggle={() => toggle("obs_easily_angered")} />
              <SelectCard label="Argues with friends and adults" selected={form.obs_argues} onToggle={() => toggle("obs_argues")} />
              <SelectCard label="Defies adults and fails to obey" selected={form.obs_defies_adults} onToggle={() => toggle("obs_defies_adults")} />
              <SelectCard label="Deliberately annoys other people" selected={form.obs_annoys_others} onToggle={() => toggle("obs_annoys_others")} />
              <SelectCard label="Aggressive behavior" selected={form.obs_aggressive} onToggle={() => toggle("obs_aggressive")} />
              <SelectCard label="Spiteful or vindictive" selected={form.obs_spiteful} onToggle={() => toggle("obs_spiteful")} />
              <SelectCard label="Blames others for their own mistakes" selected={form.obs_blames_others} onToggle={() => toggle("obs_blames_others")} />
              <SelectCard label="Breaks others' property" selected={form.obs_breaks_property} onToggle={() => toggle("obs_breaks_property")} />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">Other Indicators</h3>
            <div className="grid grid-cols-2 gap-2">
              <SelectCard label="Does not complete home assignments" selected={form.obs_incomplete_homework} onToggle={() => toggle("obs_incomplete_homework")} />
              <SelectCard label="Frequent absences or pattern of tardiness" selected={form.obs_frequent_absences} onToggle={() => toggle("obs_frequent_absences")} />
              <SelectCard label="Neglected appearance and poor eating habits" selected={form.obs_neglected_appearance} onToggle={() => toggle("obs_neglected_appearance")} />
              <SelectCard label="Use of profanity" selected={form.obs_uses_profanity} onToggle={() => toggle("obs_uses_profanity")} />
              <SelectCard label="Taking things that belong to others" selected={form.obs_takes_belongings} onToggle={() => toggle("obs_takes_belongings")} />
              <SelectCard label="Failure to bring work materials" selected={form.obs_forgets_materials} onToggle={() => toggle("obs_forgets_materials")} />
              <SelectCard label="Appearing sad most of the time" selected={form.obs_appears_sad} onToggle={() => toggle("obs_appears_sad")} />
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
