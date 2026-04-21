export interface Address {
  id: number;
  student_id: number;
  label: string | null;
  street: string;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
  created_at: string;
}

export interface NewAddressInput {
  label: string;
  street: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
}
