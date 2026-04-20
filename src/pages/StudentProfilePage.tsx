import { useState } from "react";
import { Avatar, Card, Chip, Surface, ListBox, Spinner, Tabs } from "@heroui/react";
import { Breadcrumb } from "../components/Breadcrumb";
import { useContacts } from "../hooks/useContacts";
import { useNotes } from "../hooks/useNotes";
import { useVisitations } from "../hooks/useVisitations";
import { useStudentAssignmentPreviews } from "../hooks/useStudentAssignmentPreviews";
import type { Group } from "../types/group";
import type { Student } from "../types/student";

interface StudentProfilePageProps {
  student: Student;
  group: Group;
  onGoToGroups: () => void;
  onGoToStudents: () => void;
  onGoToContacts: () => void;
  onGoToAssignments: () => void;
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
  return new Date(dateStr).toLocaleString(undefined, {
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
  onGoToAssignments,
}: StudentProfilePageProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const { contacts, loading: loadingContacts } = useContacts(student.id);
  const { notes, loading: loadingNotes } = useNotes(student.id);
  const { visitations, loading: loadingVisitations } = useVisitations(student.id);
  const { previews: assignments, loading: loadingAssignments } = useStudentAssignmentPreviews(student.id, group.id);

  return (
    <div className="p-6">
      <Breadcrumb
        items={[
          { label: "Groups", onClick: onGoToGroups },
          { label: group.name, onClick: onGoToStudents },
          { label: student.name },
        ]}
      />

      <div className="flex items-center gap-4 mb-6">
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

      <Tabs selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(String(key))}>
        <Tabs.ListContainer>
          <Tabs.List aria-label="Student sections">
            <Tabs.Tab id="overview">Overview<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="assignments">Assignments<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="visitations">Visitations<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="notes">Notes<Tabs.Indicator /></Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel className="pt-4" id="overview">
          <div className="flex flex-col gap-4">
            <Surface variant="secondary" className="rounded-2xl p-5">
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
                  <button type="button" onClick={onGoToContacts} className="text-xs text-accent hover:underline">
                    View all →
                  </button>
                </div>
                {loadingContacts ? (
                  <div className="flex justify-center py-4"><Spinner size="sm" color="accent" /></div>
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
          </div>
        </Tabs.Panel>

        <Tabs.Panel className="pt-4" id="assignments">
          <div className="flex flex-col gap-3">
            {loadingAssignments ? (
              <div className="flex justify-center py-16"><Spinner size="lg" color="accent" /></div>
            ) : assignments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                <p className="text-lg font-semibold text-muted">No assignments yet</p>
                <button type="button" onClick={onGoToAssignments} className="text-sm text-accent hover:underline">
                  View all assignments →
                </button>
              </div>
            ) : (
              <>
                {assignments.map((a) => (
                  <div key={a.assignment_id} className="rounded-xl bg-background px-4 py-3 flex items-center justify-between gap-4 border border-border/60">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-medium text-foreground truncate">{a.title}</span>
                      <span className="text-xs text-muted">
                        {new Date(a.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-right shrink-0">
                      {a.score !== null ? (
                        <span className={a.score > a.max_score ? "text-warning" : "text-foreground"}>{a.score}</span>
                      ) : (
                        <span className="text-foreground/30">—</span>
                      )}
                      <span className="text-xs text-muted ml-0.5">/ {a.max_score}</span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end pt-1">
                  <button type="button" onClick={onGoToAssignments} className="text-xs text-accent hover:underline">
                    View all assignments →
                  </button>
                </div>
              </>
            )}
          </div>
        </Tabs.Panel>

        <Tabs.Panel className="pt-4" id="visitations">
          <div className="flex flex-col gap-3">
            {loadingVisitations ? (
              <div className="flex justify-center py-16"><Spinner size="lg" color="accent" /></div>
            ) : visitations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-lg font-semibold text-muted">No visitations recorded yet</p>
              </div>
            ) : (
              visitations.map((v) => (
                <div key={v.id} className="rounded-xl bg-background px-4 py-3 flex flex-col gap-0.5 border border-border/60">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{v.contact_name}</span>
                    <span className="text-xs text-muted">{formatVisitDate(v.visited_at)}</span>
                  </div>
                  {v.notes && (
                    <p className="text-xs text-foreground/60">{v.notes}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </Tabs.Panel>

        <Tabs.Panel className="pt-4" id="notes">
          <div className="flex flex-col gap-3">
            {loadingNotes ? (
              <div className="flex justify-center py-16"><Spinner size="lg" color="accent" /></div>
            ) : notes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-lg font-semibold text-muted">No notes added yet</p>
              </div>
            ) : (
              notes.map((note) => (
                <div key={note.id} className="rounded-xl bg-background px-4 py-3 flex flex-col gap-0.5 border border-border/60">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                  <p className="text-xs text-muted">{formatNoteTimestamp(note.created_at)}</p>
                </div>
              ))
            )}
          </div>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
