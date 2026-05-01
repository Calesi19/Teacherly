export type AssignmentTag = "Exam" | "Quiz" | "Homework" | "Extra Credit" | "Project" | "Other";

export interface Assignment {
  id: number;
  group_id: number;
  period_name: string;
  assigned_date: string;
  title: string;
  description: string | null;
  max_score: number;
  tag: AssignmentTag;
  created_at: string;
  graded_count: number;
  student_count: number;
}

export interface NewAssignmentInput {
  title: string;
  description: string;
  max_score: number;
  period_name: string;
  assigned_date: string;
  tag: AssignmentTag;
}

export interface AssignmentScore {
  id: number;
  assignment_id: number;
  student_id: number;
  student_name: string;
  score: number | null;
  exempt: number;
  late: number;
  note: string | null;
}

export type GradeBand = "A" | "B" | "C" | "D" | "F" | "N";

export interface GradeDistribution {
  band: GradeBand;
  count: number;
  percentage: number;
}

export interface StudentAssignmentPreview {
  assignment_id: number;
  title: string;
  period_name: string;
  assigned_date: string;
  max_score: number;
  score: number | null;
  created_at: string;
}
