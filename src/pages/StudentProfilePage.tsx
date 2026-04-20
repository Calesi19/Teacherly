import { Avatar, Card, Chip, Surface } from "@heroui/react";
import { Breadcrumb } from "../components/Breadcrumb";
import type { Classroom } from "../types/classroom";
import type { Student } from "../types/student";

interface StudentProfilePageProps {
  student: Student;
  classroom: Classroom;
  onGoToClassrooms: () => void;
  onGoToStudents: () => void;
  onGoToFamilyMembers: () => void;
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted uppercase tracking-wide">{label}</span>
      <span className="text-sm font-medium text-foreground">{value ?? <span className="text-foreground/30">—</span>}</span>
    </div>
  );
}

function getAge(birthdate: string): number {
  const birth = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function StudentProfilePage({
  student,
  classroom,
  onGoToClassrooms,
  onGoToStudents,
  onGoToFamilyMembers,
}: StudentProfilePageProps) {
  return (
    <div className="p-6">
      <Breadcrumb
        items={[
          { label: "Classrooms", onClick: onGoToClassrooms },
          { label: classroom.name, onClick: onGoToStudents },
          { label: student.name },
        ]}
      />

      <div className="flex items-center gap-4 mb-8">
        <Avatar color="accent" size="lg">
          <Avatar.Fallback color="accent">
            {student.name.charAt(0).toUpperCase()}
          </Avatar.Fallback>
        </Avatar>
        <div>
          <h2 className="text-2xl font-bold">{student.name}</h2>
          <p className="text-sm text-muted">
            Enrolled {new Date(student.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <Surface variant="secondary" className="rounded-2xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">Student Info</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
          <InfoField label="Student ID" value={student.student_number} />
          <InfoField label="Gender" value={student.gender} />
          <InfoField
            label="Birthdate"
            value={
              student.birthdate
                ? `${new Date(student.birthdate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} (${getAge(student.birthdate)})`
                : null
            }
          />
          <InfoField
            label="Enrollment Date"
            value={
              student.enrollment_date
                ? new Date(student.enrollment_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                : null
            }
          />
        </div>
      </Surface>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card variant="secondary">
          <Card.Header>
            <Card.Title className="text-base">Classroom</Card.Title>
          </Card.Header>
          <Card.Content>
            <p className="font-medium">{classroom.name}</p>
            <div className="flex gap-2 mt-1">
              {classroom.subject && (
                <Chip variant="secondary" color="accent" size="sm">{classroom.subject}</Chip>
              )}
              {classroom.grade && (
                <Chip variant="tertiary" size="sm">{classroom.grade}</Chip>
              )}
            </div>
          </Card.Content>
        </Card>

        <Card
          variant="secondary"
          className="cursor-pointer hover:shadow-md hover:border-accent/30 transition-all"
          onClick={onGoToFamilyMembers}
        >
          <Card.Header>
            <Card.Title className="text-base">Family Members</Card.Title>
          </Card.Header>
          <Card.Content>
            <p className="text-sm text-muted">View and manage family contacts →</p>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
