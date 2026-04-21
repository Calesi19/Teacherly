export interface Assignment {
  id: number;
  group_id: number;
  period_name: string;
  title: string;
  description: string | null;
  max_score: number;
  created_at: string;
}

export interface NewAssignmentInput {
  title: string;
  description: string;
  max_score: number;
  period_name: string;
}

export interface AssignmentScore {
  id: number;
  assignment_id: number;
  student_id: number;
  student_name: string;
  score: number | null;
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
  max_score: number;
  score: number | null;
  created_at: string;
}
