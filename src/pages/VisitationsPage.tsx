import { useState } from "react";
import {
  Button,
  Modal,
  Label,
  Input,
  Spinner,
  Select,
  ListBox,
  DatePicker,
  DateField,
  Calendar,
  useOverlayState,
} from "@heroui/react";
import { parseDate } from "@internationalized/date";
import type { DateValue } from "@internationalized/date";
import { useVisitations } from "../hooks/useVisitations";
import { useContacts } from "../hooks/useContacts";
import { Breadcrumb } from "../components/Breadcrumb";
import { useTranslation } from "../i18n/LanguageContext";
import type { Group } from "../types/group";
import type { Student } from "../types/student";
import type { NewVisitationInput } from "../types/visitation";

interface VisitationsPageProps {
  student: Student;
  group: Group;
  onGoToGroups: () => void;
  onGoToStudents: () => void;
  onGoToStudentProfile: () => void;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function todayDateValue(): DateValue {
  const d = new Date();
  return parseDate(
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  );
}

export function VisitationsPage({
  student,
  group,
  onGoToGroups,
  onGoToStudents,
  onGoToStudentProfile,
}: VisitationsPageProps) {
  const { visitations, loading, error, addVisitation } = useVisitations(student.id);
  const { contacts } = useContacts(student.id);
  const { t } = useTranslation();
  const modalState = useOverlayState();
  const [selectedVisitorKey, setSelectedVisitorKey] = useState<string | null>(null);
  const [newVisitorName, setNewVisitorName] = useState("");
  const [notes, setNotes] = useState("");
  const [visitedAt, setVisitedAt] = useState<DateValue | null>(todayDateValue());
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const isNewVisitor = selectedVisitorKey === "new";
  const matchedContact = selectedVisitorKey && selectedVisitorKey !== "new"
    ? contacts.find((c) => String(c.id) === selectedVisitorKey) ?? null
    : null;

  const canSubmit =
    !submitting &&
    visitedAt !== null &&
    (isNewVisitor ? newVisitorName.trim().length > 0 : matchedContact !== null);

  const closeModal = () => {
    setSelectedVisitorKey(null);
    setNewVisitorName("");
    setNotes("");
    setVisitedAt(todayDateValue());
    setAddError(null);
    modalState.close();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !visitedAt) return;
    setSubmitting(true);
    setAddError(null);
    try {
      const input: NewVisitationInput = {
        contact_id: matchedContact ? matchedContact.id : null,
        visitor_name: isNewVisitor ? newVisitorName.trim() : (matchedContact?.name ?? ""),
        notes,
        visited_at: visitedAt.toString(),
      };
      await addVisitation(input);
      closeModal();
    } catch (err) {
      setAddError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 flex flex-col h-full">
      <Breadcrumb
        items={[
          { label: t("groups.breadcrumb"), onClick: onGoToGroups },
          { label: group.name, onClick: onGoToStudents },
          { label: student.name, onClick: onGoToStudentProfile },
          { label: t("visitations.breadcrumb") },
        ]}
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{t("visitations.title")}</h2>
          <p className="text-sm text-muted">{student.name}</p>
        </div>
        <Button variant="primary" size="sm" onPress={modalState.open}>
          {t("visitations.logVisitation")}
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" color="accent" />
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-lg bg-danger/10 text-danger px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && visitations.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 text-center">
          <p className="text-lg font-semibold text-muted">{t("visitations.noVisitationsYet")}</p>
          <p className="text-sm text-foreground/40 mt-1">{t("visitations.noVisitationsHint")}</p>
        </div>
      )}

      {!loading && visitations.length > 0 && (
        <div className="flex flex-col gap-3">
          {visitations.map((v) => (
            <div key={v.id} className="rounded-2xl bg-background-secondary p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{v.contact_name}</span>
                <span className="text-xs text-muted">{formatDate(v.visited_at)}</span>
              </div>
              {v.notes && (
                <p className="text-sm text-foreground/80 whitespace-pre-wrap mt-1">{v.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal state={modalState}>
        <Modal.Backdrop isDismissable={!submitting}>
          <Modal.Container>
            <Modal.Dialog className="overflow-visible">
              <form onSubmit={handleSubmit}>
                <Modal.Header>{t("visitations.modal.title")}</Modal.Header>
                <Modal.Body className="flex flex-col gap-4 pb-px overflow-visible">

                  <div className="flex flex-col gap-1.5">
                    <Label>{t("visitations.modal.visitorLabel")}</Label>
                    <Select
                      aria-label={t("visitations.modal.visitorLabel")}
                      selectedKey={selectedVisitorKey}
                      onSelectionChange={(key) => {
                        setSelectedVisitorKey(key ? String(key) : null);
                        setNewVisitorName("");
                      }}
                    >
                      <Select.Trigger>
                        <Select.Value>
                          {({ isPlaceholder }) =>
                            isPlaceholder ? t("visitations.modal.selectVisitor") : undefined
                          }
                        </Select.Value>
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {contacts.map((c) => (
                            <ListBox.Item key={c.id} id={String(c.id)} textValue={c.name}>
                              <div className="flex flex-col">
                                <span className="text-sm">{c.name}</span>
                                {c.relationship && (
                                  <span className="text-xs text-foreground/50">{c.relationship}</span>
                                )}
                              </div>
                            </ListBox.Item>
                          ))}
                          <ListBox.Item id="new" textValue={t("visitations.modal.newVisitor")}>
                            <span className="text-accent text-sm">{t("visitations.modal.newVisitor")}</span>
                          </ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>

                  {isNewVisitor && (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="new-visitor-name">{t("visitations.modal.newVisitorNameLabel")}</Label>
                      <Input
                        id="new-visitor-name"
                        value={newVisitorName}
                        onChange={(e) => setNewVisitorName(e.target.value)}
                        placeholder={t("visitations.modal.newVisitorNamePlaceholder")}
                        autoFocus
                      />
                      <p className="text-xs text-accent">{t("visitations.modal.newContactHint")}</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <Label>{t("visitations.modal.dateLabel")}</Label>
                    <DatePicker
                      className="w-full"
                      aria-label={t("visitations.modal.dateLabel")}
                      value={visitedAt}
                      onChange={(date: DateValue | null) => setVisitedAt(date)}
                    >
                      <DateField.Group fullWidth>
                        <DateField.Input>
                          {(segment) => <DateField.Segment segment={segment} />}
                        </DateField.Input>
                        <DateField.Suffix>
                          <DatePicker.Trigger>
                            <DatePicker.TriggerIndicator />
                          </DatePicker.Trigger>
                        </DateField.Suffix>
                      </DateField.Group>
                      <DatePicker.Popover>
                        <Calendar aria-label={t("visitations.modal.dateLabel")}>
                          <Calendar.Header>
                            <Calendar.YearPickerTrigger>
                              <Calendar.YearPickerTriggerHeading />
                              <Calendar.YearPickerTriggerIndicator />
                            </Calendar.YearPickerTrigger>
                            <Calendar.NavButton slot="previous" />
                            <Calendar.NavButton slot="next" />
                          </Calendar.Header>
                          <Calendar.Grid>
                            <Calendar.GridHeader>
                              {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                            </Calendar.GridHeader>
                            <Calendar.GridBody>
                              {(date) => <Calendar.Cell date={date} />}
                            </Calendar.GridBody>
                          </Calendar.Grid>
                          <Calendar.YearPickerGrid>
                            <Calendar.YearPickerGridBody>
                              {({ year }) => <Calendar.YearPickerCell year={year} />}
                            </Calendar.YearPickerGridBody>
                          </Calendar.YearPickerGrid>
                        </Calendar>
                      </DatePicker.Popover>
                    </DatePicker>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="visit-notes">{t("visitations.modal.notesLabel")}</Label>
                    <textarea
                      id="visit-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t("visitations.modal.notesPlaceholder")}
                      rows={4}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                    />
                  </div>

                  {addError && (
                    <p className="text-danger text-sm">{addError}</p>
                  )}
                </Modal.Body>
                <Modal.Footer>
                  <Button type="button" variant="ghost" onPress={closeModal}>
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" variant="primary" isDisabled={!canSubmit}>
                    {submitting ? <Spinner size="sm" /> : t("common.log")}
                  </Button>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
