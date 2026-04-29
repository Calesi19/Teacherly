import { useState } from "react";
import {
  Button,
  EmptyState,
  Modal,
  Label,
  Input,
  Spinner,
  TableColumn,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableContent,
  TableScrollContainer,
  TableRoot,
  useOverlayState,
  Select,
  ListBox,
  DatePicker,
  DateField,
  Calendar,
  Checkbox,
  Tooltip,
} from "@heroui/react";
import type { Selection } from "@heroui/react";
import { Cake, GraduationCap, Inbox } from "lucide-react";
import { parseDate } from "@internationalized/date";
import type { DateValue } from "@internationalized/date";
import Database from "@tauri-apps/plugin-sql";
import { useStudents } from "../hooks/useStudents";
import { Breadcrumb } from "../components/Breadcrumb";
import { useTranslation } from "../i18n/LanguageContext";
import { NOTE_TAG_KEYS, NOTE_TAG_COLORS, serializeTags, type NoteTagKey } from "../types/note";
import type { Group } from "../types/group";
import type { Student } from "../types/student";

const DB_URL = "sqlite:teacherly.db";

function isBirthdaySoon(birthdate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const birth = new Date(birthdate);
  const next = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return (next.getTime() - today.getTime()) / 86_400_000 <= 30;
}

interface StudentsPageProps {
  group: Group;
  onGoToDashboard: () => void;
  onGoToGroups: () => void;
  onSelectStudent: (student: Student) => void;
}

export function StudentsPage({
  group,
  onGoToDashboard,
  onGoToGroups,
  onSelectStudent,
}: StudentsPageProps) {
  const { students, loading, error, addStudent } = useStudents(group.id);
  const { t } = useTranslation();
  const modalState = useOverlayState();
  const noteModalState = useOverlayState();
  const emptyForm = {
    name: "",
    gender: "",
    birthdate: "",
    student_number: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set());
  const [noteContent, setNoteContent] = useState("");
  const [noteTags, setNoteTags] = useState<NoteTagKey[]>([]);
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const closeModal = () => {
    setForm(emptyForm);
    setAddError(null);
    modalState.close();
  };

  const closeNoteModal = () => {
    setNoteContent("");
    setNoteTags([]);
    setNoteError(null);
    noteModalState.close();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    setAddError(null);
    try {
      await addStudent({ ...form, name: form.name.trim(), enrollment_date: group.start_date ?? "" });
      setForm(emptyForm);
      modalState.close();
    } catch (err) {
      setAddError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedStudents =
    selectedKeys === "all"
      ? filtered
      : filtered.filter((s) => (selectedKeys as Set<number>).has(s.id));

  const hasSelection = selectedStudents.length > 0;

  const handleBulkAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    setNoteSubmitting(true);
    setNoteError(null);
    try {
      const db = await Database.load(DB_URL);
      await Promise.all(
        selectedStudents.map((s) =>
          db.execute(
            "INSERT INTO student_notes (student_id, content, tags) VALUES (?, ?, ?)",
            [s.id, noteContent.trim(), serializeTags(noteTags)],
          ),
        ),
      );
      setSelectedKeys(new Set());
      closeNoteModal();
    } catch (err) {
      setNoteError(String(err));
    } finally {
      setNoteSubmitting(false);
    }
  };

  const bulkNoteTitle =
    selectedStudents.length === 1
      ? t("students.bulkNoteModal.titleSingular")
      : t("students.bulkNoteModal.titlePlural", {
          count: selectedStudents.length,
        });

  return (
    <div className="p-6 flex flex-col h-full">
      <Breadcrumb
        items={[
          { label: t("groups.breadcrumb"), onClick: onGoToGroups },
          { label: group.name, onClick: onGoToDashboard },
          { label: t("attendance.studentsHeader") },
        ]}
      />

      <div className="mb-1">
        <h2 className="text-2xl font-bold">{t("students.title")}</h2>
      </div>

      <div className="flex items-center justify-between mt-6 mb-4">
        {!loading && students.length > 0 && (
          <Input
            placeholder={t("students.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        )}
        <div className="flex items-center gap-2 ml-auto">
          {hasSelection ? (
            <>
              <span className="text-sm text-muted">
                {selectedStudents.length} {t("students.selected")}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onPress={noteModalState.open}
              >
                {t("students.addNote")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => setSelectedKeys(new Set())}
              >
                {t("students.clear")}
              </Button>
            </>
          ) : (
            <Button variant="primary" size="sm" onPress={modalState.open}>
              {t("students.addStudent")}
            </Button>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" color="accent" />
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg bg-danger/10 text-danger px-4 py-3 text-sm"
        >
          {error}
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0">
        {!loading && !error && (
          <TableRoot variant="primary" className="flex-1 h-full">
            <TableScrollContainer className="h-full">
              <TableContent
                aria-label={t("students.title")}
                selectionMode="multiple"
                selectedKeys={selectedKeys}
                onSelectionChange={setSelectedKeys}
                onRowAction={(key) => {
                  const student = students.find((s) => s.id === key);
                  if (student) onSelectStudent(student);
                }}
              >
                <TableHeader>
                  <TableColumn className="pr-0 w-10">
                    <Checkbox aria-label="Select all" slot="selection">
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                    </Checkbox>
                  </TableColumn>
                  <TableColumn isRowHeader>
                    {t("students.tableColumns.name")}
                  </TableColumn>
                  <TableColumn>
                    {t("students.tableColumns.gender")}
                  </TableColumn>
                  <TableColumn>
                    {t("students.tableColumns.birthdate")}
                  </TableColumn>
                  <TableColumn>{" "}</TableColumn>
                  <TableColumn>
                    {t("students.tableColumns.studentId")}
                  </TableColumn>
                </TableHeader>
                <TableBody
                  renderEmptyState={() => (
                    <EmptyState className="flex h-full w-full flex-col items-center justify-center gap-2 py-12 text-center">
                      <Inbox className="size-6 text-muted" />
                      <span className="text-sm font-medium text-muted">
                        {students.length === 0
                          ? t("students.noStudentsYet")
                          : t("students.noResultsTitle")}
                      </span>
                      <span className="text-xs text-foreground/40">
                        {students.length === 0
                          ? t("students.noStudentsHint")
                          : t("students.noResultsHint", { search })}
                      </span>
                    </EmptyState>
                  )}
                >
                  {filtered.map((s) => (
                    <TableRow
                      key={s.id}
                      id={s.id}
                      className="cursor-pointer"
                    >
                      <TableCell className="pr-0">
                        <Checkbox
                          aria-label={`Select ${s.name}`}
                          slot="selection"
                          variant="secondary"
                        >
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                        </Checkbox>
                      </TableCell>
                      <TableCell className="font-medium">
                        {s.name}
                      </TableCell>
                      <TableCell className="text-sm text-foreground/50">
                        {s.gender || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-foreground/50">
                        {s.birthdate
                          ? (() => {
                              const birth = new Date(s.birthdate);
                              const today = new Date();
                              let age =
                                today.getFullYear() - birth.getFullYear();
                              const m = today.getMonth() - birth.getMonth();
                              if (
                                m < 0 ||
                                (m === 0 &&
                                  today.getDate() < birth.getDate())
                              )
                                age--;
                              return `${birth.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} (${age})`;
                            })()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {s.has_special_education === 1 && (
                            <Tooltip>
                              <Tooltip.Trigger>
                                <span className="inline-flex items-center justify-center size-5 rounded-full bg-accent/10 text-accent">
                                  <GraduationCap size={10} />
                                </span>
                              </Tooltip.Trigger>
                              <Tooltip.Content>{t("students.badges.specialEducation")}</Tooltip.Content>
                            </Tooltip>
                          )}
                          {s.birthdate && isBirthdaySoon(s.birthdate) && (
                            <Tooltip>
                              <Tooltip.Trigger>
                                <span className="inline-flex items-center justify-center size-5 rounded-full bg-warning/10 text-warning">
                                  <Cake size={10} />
                                </span>
                              </Tooltip.Trigger>
                              <Tooltip.Content>{t("students.badges.birthdaySoon")}</Tooltip.Content>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-foreground/40">
                        {s.student_number || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </TableContent>
            </TableScrollContainer>
          </TableRoot>
        )}
      </div>

      {/* Add Student modal */}
      <Modal state={modalState}>
        <Modal.Backdrop isDismissable={!submitting}>
          <Modal.Container>
            <Modal.Dialog className="overflow-visible">
              <form onSubmit={handleSubmit}>
                <Modal.Header>
                  {t("students.addStudentModal.title")}
                </Modal.Header>
                <Modal.Body className="flex flex-col gap-4 pb-px overflow-visible">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="add-student-name">
                      {t("students.addStudentModal.nameLabel")}
                    </Label>
                    <Input
                      id="add-student-name"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder={t(
                        "students.addStudentModal.namePlaceholder",
                      )}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label>{t("students.addStudentModal.genderLabel")}</Label>
                    <Select
                      aria-label={t("students.addStudentModal.genderLabel")}
                      selectedKey={form.gender || null}
                      onSelectionChange={(key) =>
                        setForm({ ...form, gender: String(key ?? "") })
                      }
                    >
                      <Select.Trigger>
                        <Select.Value>
                          {({ selectedText, isPlaceholder }) =>
                            isPlaceholder
                              ? t("students.addStudentModal.selectGender")
                              : selectedText
                          }
                        </Select.Value>
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item
                            id="Male"
                            textValue={t("students.addStudentModal.male")}
                          >
                            {t("students.addStudentModal.male")}
                          </ListBox.Item>
                          <ListBox.Item
                            id="Female"
                            textValue={t("students.addStudentModal.female")}
                          >
                            {t("students.addStudentModal.female")}
                          </ListBox.Item>
                          <ListBox.Item
                            id="Other"
                            textValue={t("students.addStudentModal.other")}
                          >
                            {t("students.addStudentModal.other")}
                          </ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label>
                      {t("students.addStudentModal.birthdateLabel")}
                    </Label>
                    <DatePicker
                      className="w-full"
                      aria-label={t("students.addStudentModal.birthdateLabel")}
                      value={form.birthdate ? parseDate(form.birthdate) : null}
                      onChange={(date: DateValue | null) =>
                        setForm({
                          ...form,
                          birthdate: date ? date.toString() : "",
                        })
                      }
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
                        <Calendar
                          aria-label={t(
                            "students.addStudentModal.birthdateLabel",
                          )}
                        >
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
                              {(day) => (
                                <Calendar.HeaderCell>{day}</Calendar.HeaderCell>
                              )}
                            </Calendar.GridHeader>
                            <Calendar.GridBody>
                              {(date) => <Calendar.Cell date={date} />}
                            </Calendar.GridBody>
                          </Calendar.Grid>
                          <Calendar.YearPickerGrid>
                            <Calendar.YearPickerGridBody>
                              {({ year }) => (
                                <Calendar.YearPickerCell year={year} />
                              )}
                            </Calendar.YearPickerGridBody>
                          </Calendar.YearPickerGrid>
                        </Calendar>
                      </DatePicker.Popover>
                    </DatePicker>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="add-student-number">
                      {t("students.addStudentModal.studentIdLabel")}
                    </Label>
                    <Input
                      id="add-student-number"
                      value={form.student_number}
                      onChange={(e) =>
                        setForm({ ...form, student_number: e.target.value })
                      }
                      placeholder={t(
                        "students.addStudentModal.studentIdPlaceholder",
                      )}
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
                  <Button
                    type="submit"
                    variant="primary"
                    isDisabled={submitting}
                  >
                    {submitting ? <Spinner size="sm" /> : t("common.add")}
                  </Button>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Bulk Add Note modal */}
      <Modal state={noteModalState}>
        <Modal.Backdrop isDismissable={!noteSubmitting}>
          <Modal.Container>
            <Modal.Dialog>
              <form onSubmit={handleBulkAddNote}>
                <Modal.Header>{bulkNoteTitle}</Modal.Header>
                <Modal.Body className="flex flex-col gap-4 pb-px overflow-y-auto">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bulk-note-content">
                      {t("students.bulkNoteModal.noteLabel")}
                    </Label>
                    <textarea
                      id="bulk-note-content"
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder={t("students.bulkNoteModal.notePlaceholder")}
                      rows={4}
                      required
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium">
                      {t("students.bulkNoteModal.tagsLabel")}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {NOTE_TAG_KEYS.map((tag) => {
                        const isActive = noteTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() =>
                              setNoteTags((prev) =>
                                isActive ? prev.filter((k) => k !== tag) : [...prev, tag]
                              )
                            }
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                              isActive ? NOTE_TAG_COLORS[tag].active : NOTE_TAG_COLORS[tag].inactive
                            }`}
                          >
                            {t(`studentProfile.notes.tags.${tag}` as Parameters<typeof t>[0])}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {noteError && (
                    <p className="text-danger text-sm">{noteError}</p>
                  )}
                </Modal.Body>
                <Modal.Footer>
                  <Button
                    type="button"
                    variant="ghost"
                    onPress={closeNoteModal}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isDisabled={noteSubmitting || !noteContent.trim()}
                  >
                    {noteSubmitting ? <Spinner size="sm" /> : t("common.add")}
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
