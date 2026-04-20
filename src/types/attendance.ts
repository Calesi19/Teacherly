export type AttendanceStatus = "present" | "absent" | "late" | "early_pickup";

export interface AttendanceRecord {
  id: number;
  schedule_period_id: number;
  student_id: number;
  date: string;
  status: AttendanceStatus;
  created_at: string;
}

export interface StudentAttendanceRow {
  student_id: number;
  student_name: string;
  schedule_period_id: number;
  status: AttendanceStatus;
  record_id: number | null;
}
