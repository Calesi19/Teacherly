export interface SchedulePeriod {
  id: number;
  classroom_id: number;
  day_of_week: number;
  name: string;
  start_time: string;
  end_time: string;
  sort_order: number;
  created_at: string;
}

export interface NewSchedulePeriodInput {
  day_of_week: number;
  name: string;
  start_time: string;
  end_time: string;
}

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DAY_LABELS: Record<DayOfWeek, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};
