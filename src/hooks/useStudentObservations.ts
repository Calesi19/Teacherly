import { useState, useEffect, useCallback } from "react";
import Database from "@tauri-apps/plugin-sql";
import type { StudentObservations, StudentObservationsInput } from "../types/studentObservations";

const DB_URL = "sqlite:teacherly.db";

export function useStudentObservations(studentId: number) {
  const [data, setData] = useState<StudentObservations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const db = await Database.load(DB_URL);
      const rows = await db.select<StudentObservations[]>(
        `SELECT id, student_id,
           obs_reading_writing, obs_mirror_numbers, obs_left_right_confusion, obs_sequence_difficulty,
           obs_disorganized_work, obs_inattention_detail, obs_sustained_attention, obs_doesnt_listen,
           obs_task_organization, obs_loses_belongings, obs_distracted_stimuli, obs_forgetful,
           obs_excess_hand_foot, obs_gets_up_from_seat, obs_running_jumping, obs_talks_excessively,
           obs_difficulty_quiet, obs_driven_by_motor, obs_impulsive_answers, obs_difficulty_waiting,
           obs_interrupts_others, obs_easily_angered, obs_argues, obs_defies_adults, obs_annoys_others,
           obs_aggressive, obs_spiteful, obs_blames_others, obs_breaks_property,
           obs_incomplete_homework, obs_frequent_absences, obs_neglected_appearance, obs_uses_profanity,
           obs_takes_belongings, obs_forgets_materials, obs_appears_sad
         FROM student_observations WHERE student_id = ? AND is_deleted = 0 LIMIT 1`,
        [studentId],
      );
      setData(rows[0] ?? null);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const save = useCallback(
    async (input: StudentObservationsInput) => {
      const db = await Database.load(DB_URL);
      const b = (v: boolean) => (v ? 1 : 0);
      await db.execute(
        `INSERT INTO student_observations (
           student_id,
           obs_reading_writing, obs_mirror_numbers, obs_left_right_confusion, obs_sequence_difficulty,
           obs_disorganized_work, obs_inattention_detail, obs_sustained_attention, obs_doesnt_listen,
           obs_task_organization, obs_loses_belongings, obs_distracted_stimuli, obs_forgetful,
           obs_excess_hand_foot, obs_gets_up_from_seat, obs_running_jumping, obs_talks_excessively,
           obs_difficulty_quiet, obs_driven_by_motor, obs_impulsive_answers, obs_difficulty_waiting,
           obs_interrupts_others, obs_easily_angered, obs_argues, obs_defies_adults, obs_annoys_others,
           obs_aggressive, obs_spiteful, obs_blames_others, obs_breaks_property,
           obs_incomplete_homework, obs_frequent_absences, obs_neglected_appearance, obs_uses_profanity,
           obs_takes_belongings, obs_forgets_materials, obs_appears_sad
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(student_id) DO UPDATE SET
           obs_reading_writing      = excluded.obs_reading_writing,
           obs_mirror_numbers       = excluded.obs_mirror_numbers,
           obs_left_right_confusion = excluded.obs_left_right_confusion,
           obs_sequence_difficulty  = excluded.obs_sequence_difficulty,
           obs_disorganized_work    = excluded.obs_disorganized_work,
           obs_inattention_detail   = excluded.obs_inattention_detail,
           obs_sustained_attention  = excluded.obs_sustained_attention,
           obs_doesnt_listen        = excluded.obs_doesnt_listen,
           obs_task_organization    = excluded.obs_task_organization,
           obs_loses_belongings     = excluded.obs_loses_belongings,
           obs_distracted_stimuli   = excluded.obs_distracted_stimuli,
           obs_forgetful            = excluded.obs_forgetful,
           obs_excess_hand_foot     = excluded.obs_excess_hand_foot,
           obs_gets_up_from_seat    = excluded.obs_gets_up_from_seat,
           obs_running_jumping      = excluded.obs_running_jumping,
           obs_talks_excessively    = excluded.obs_talks_excessively,
           obs_difficulty_quiet     = excluded.obs_difficulty_quiet,
           obs_driven_by_motor      = excluded.obs_driven_by_motor,
           obs_impulsive_answers    = excluded.obs_impulsive_answers,
           obs_difficulty_waiting   = excluded.obs_difficulty_waiting,
           obs_interrupts_others    = excluded.obs_interrupts_others,
           obs_easily_angered       = excluded.obs_easily_angered,
           obs_argues               = excluded.obs_argues,
           obs_defies_adults        = excluded.obs_defies_adults,
           obs_annoys_others        = excluded.obs_annoys_others,
           obs_aggressive           = excluded.obs_aggressive,
           obs_spiteful             = excluded.obs_spiteful,
           obs_blames_others        = excluded.obs_blames_others,
           obs_breaks_property      = excluded.obs_breaks_property,
           obs_incomplete_homework  = excluded.obs_incomplete_homework,
           obs_frequent_absences    = excluded.obs_frequent_absences,
           obs_neglected_appearance = excluded.obs_neglected_appearance,
           obs_uses_profanity       = excluded.obs_uses_profanity,
           obs_takes_belongings     = excluded.obs_takes_belongings,
           obs_forgets_materials    = excluded.obs_forgets_materials,
           obs_appears_sad          = excluded.obs_appears_sad,
           is_deleted               = 0`,
        [
          studentId,
          b(input.obs_reading_writing), b(input.obs_mirror_numbers), b(input.obs_left_right_confusion), b(input.obs_sequence_difficulty),
          b(input.obs_disorganized_work), b(input.obs_inattention_detail), b(input.obs_sustained_attention), b(input.obs_doesnt_listen),
          b(input.obs_task_organization), b(input.obs_loses_belongings), b(input.obs_distracted_stimuli), b(input.obs_forgetful),
          b(input.obs_excess_hand_foot), b(input.obs_gets_up_from_seat), b(input.obs_running_jumping), b(input.obs_talks_excessively),
          b(input.obs_difficulty_quiet), b(input.obs_driven_by_motor), b(input.obs_impulsive_answers), b(input.obs_difficulty_waiting),
          b(input.obs_interrupts_others), b(input.obs_easily_angered), b(input.obs_argues), b(input.obs_defies_adults), b(input.obs_annoys_others),
          b(input.obs_aggressive), b(input.obs_spiteful), b(input.obs_blames_others), b(input.obs_breaks_property),
          b(input.obs_incomplete_homework), b(input.obs_frequent_absences), b(input.obs_neglected_appearance), b(input.obs_uses_profanity),
          b(input.obs_takes_belongings), b(input.obs_forgets_materials), b(input.obs_appears_sad),
        ],
      );
      await fetchData();
    },
    [studentId, fetchData],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, save };
}
