import { Avatar, Card, Chip, Surface, ListBox, Spinner } from "@heroui/react";
import { Breadcrumb } from "../components/Breadcrumb";
import { useContacts } from "../hooks/useContacts";
import { useNotes } from "../hooks/useNotes";
import { useVisitations } from "../hooks/useVisitations";
import type { Group } from "../types/group";
import type { Student } from "../types/student";

interface StudentProfilePageProps {
  student: Student;
  group: Group;
  onGoToGroups: () => void;
  onGoToStudents: () => void;
  onGoToContacts: () => void;
  onGoToVisitations: () => void;
  onGoToNotes: () => void;
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

function formatNoteTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatVisitDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function StudentProfilePage({
  student,
  group,
  onGoToGroups,
  onGoToStudents,
  onGoToContacts,
  onGoToVisitations,
  onGoToNotes,
}: StudentProfilePageProps) {
  const { contacts, loading: loadingContacts } = useContacts(student.id);
  const { notes, loading: loadingNotes } = useNotes(student.id);
  const { visitations, loading: loadingVisitations } = useVisitations(student.id);

  return (
    <div className="p-6">
      <Breadcrumb
        items={[
          { label: "Groups", onClick: onGoToGroups },
          { label: group.name, onClick: onGoToStudents },
          { label: student.name },
        ]}
      />

      <div className="flex items-center gap-4 mb-8">
        <Avatar size="lg">
          <Avatar.Fallback className="bg-accent text-white font-semibold">
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
                ? new Date(student.birthdate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                : null
            }
          />
          <InfoField
            label="Age"
            value={student.birthdate ? `${getAge(student.birthdate)} years old` : null}
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
            <Card.Title className="text-base">Group</Card.Title>
          </Card.Header>
          <Card.Content>
            <p className="font-medium">{group.name}</p>
            <div className="flex gap-2 mt-1">
              {group.subject && (
                <Chip variant="secondary" color="accent" size="sm">{group.subject}</Chip>
              )}
              {group.grade && (
                <Chip variant="tertiary" size="sm">{group.grade}</Chip>
              )}
            </div>
          </Card.Content>
        </Card>

        <Surface variant="secondary" className="rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wide">Contacts</h3>
            <button
              type="button"
              onClick={onGoToContacts}
              className="text-xs text-accent hover:underline"
            >
              View all →
            </button>
          </div>

          {loadingContacts ? (
            <div className="flex justify-center py-4">
              <Spinner size="sm" color="accent" />
            </div>
          ) : contacts.length === 0 ? (
            <p className="text-sm text-foreground/40">No contacts added yet.</p>
          ) : (
            <ListBox aria-label="Contacts" selectionMode="none">
              {contacts.slice(0, 3).map((contact) => (
                <ListBox.Item key={contact.id} id={contact.id} textValue={contact.name}>
                  <div className="flex flex-col py-0.5">
                    <span className="text-sm font-medium">
                      {contact.name}
                      {contact.is_emergency_contact ? (
                        <span className="ml-2 text-xs text-accent font-normal">Emergency Contact</span>
                      ) : null}
                    </span>
                    {contact.relationship && (
                      <span className="text-xs text-muted">{contact.relationship}</span>
                    )}
                  </div>
                </ListBox.Item>
              ))}
            </ListBox>
          )}
        </Surface>
      </div>

      <Surface variant="secondary" className="rounded-2xl p-5 mt-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wide">Recent Visitations</h3>
          <button
            type="button"
            onClick={onGoToVisitations}
            className="text-xs text-accent hover:underline"
          >
            View all →
          </button>
        </div>

        {loadingVisitations ? (
          <div className="flex justify-center py-4">
            <Spinner size="sm" color="accent" />
          </div>
        ) : visitations.length === 0 ? (
          <p className="text-sm text-foreground/40">No visitations recorded yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {visitations.slice(0, 3).map((v) => (
              <div key={v.id} className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{v.contact_name}</span>
                  <span className="text-xs text-muted">{formatVisitDate(v.visited_at)}</span>
                </div>
                {v.notes && (
                  <p className="text-xs text-foreground/60 truncate">{v.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Surface>

      <Surface variant="secondary" className="rounded-2xl p-5 mt-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wide">Recent Notes</h3>
          <button
            type="button"
            onClick={onGoToNotes}
            className="text-xs text-accent hover:underline"
          >
            View all →
          </button>
        </div>

        {loadingNotes ? (
          <div className="flex justify-center py-4">
            <Spinner size="sm" color="accent" />
          </div>
        ) : notes.length === 0 ? (
          <p className="text-sm text-foreground/40">No notes added yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {notes.slice(0, 3).map((note) => (
              <div key={note.id} className="flex flex-col gap-0.5">
                <p className="text-sm text-foreground">{note.content}</p>
                <p className="text-xs text-muted">{formatNoteTimestamp(note.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </Surface>
    </div>
  );
}
