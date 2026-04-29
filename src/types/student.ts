export interface Student {
  id: number;
  group_id: number;
  name: string;
  gender: string | null;
  birthdate: string | null;
  student_number: string | null;
  enrollment_date: string | null;
  enrollment_end_date: string | null;
  created_at: string;
  has_special_education: number | null;
}

export interface NewStudentInput {
  name: string;
  gender: string;
  birthdate: string;
  student_number: string;
  enrollment_date: string;
}

export interface UpdateStudentInput {
  name: string;
  gender: string;
  birthdate: string;
  student_number: string;
  enrollment_date: string;
  enrollment_end_date: string;
}
