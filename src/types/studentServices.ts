export interface StudentServices {
  id: number;
  student_id: number;
  has_special_education: number;
  therapy_speech: number;
  therapy_occupational: number;
  therapy_psychological: number;
  therapy_physical: number;
  medical_plan: "private" | "government" | "none";
  has_treatment: number;
  allergies: string | null;
}

export interface StudentServicesInput {
  has_special_education: boolean;
  therapy_speech: boolean;
  therapy_occupational: boolean;
  therapy_psychological: boolean;
  therapy_physical: boolean;
  medical_plan: "private" | "government" | "none";
  has_treatment: boolean;
  allergies: string;
}
