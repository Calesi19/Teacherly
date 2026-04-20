export interface Group {
  id: number;
  name: string;
  grade: string | null;
  created_at: string;
  student_count: number;
  start_date: string | null;
  end_date: string | null;
}

export interface NewGroupInput {
  name: string;
  grade: string;
  start_date: string;
  end_date: string;
}
