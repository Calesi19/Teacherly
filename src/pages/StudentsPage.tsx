import { useState } from "react";
import { Cake, GraduationCap, Inbox } from "lucide-react";
import Database from "@tauri-apps/plugin-sql";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AppDatePicker } from "@/components/ui/app-date-picker";
import { cn } from "@/lib/utils";
import { useStudents } from "../hooks/useStudents";
import { Breadcrumb } from "../components/Breadcrumb";
import { useTranslation } from "../i18n/LanguageContext";
import {
  NOTE_TAG_KEYS,
  NOTE_TAG_COLORS,
  serializeTags,
  type NoteTagKey,
} from "../types/note";
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

function formatBirthdate(birthdate: string | null): string {
  if (!birthdate) return "—";

  const birth = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();

  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return `${birth.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} (${age})`;
}

interface StudentsPageProps {
  group: Group;
  onGoToGroups: () => void;
  onSelectStudent: (student: Student) => void;
}

const emptyForm = {
  name: "",
  gender: "",
  birthdate: "",
  student_number: "",
};

export function StudentsPage({
  group,
  onGoToGroups,
  onSelectStudent,
}: StudentsPageProps) {
  const { students, loading, error, addStudent } = useStudents(group.id);
  const { t } = useTranslation();
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [bulkNoteOpen, setBulkNoteOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Set<number>>(new Set());
  const [noteContent, setNoteContent] = useState("");
  const [noteTags, setNoteTags] = useState<NoteTagKey[]>([]);
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const closeAddStudentDialog = () => {
    setForm(emptyForm);
    setAddError(null);
    setAddStudentOpen(false);
  };

  const closeBulkNoteDialog = () => {
    setNoteContent("");
    setNoteTags([]);
    setNoteError(null);
    setBulkNoteOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setSubmitting(true);
    setAddError(null);
    try {
      await addStudent({
        ...form,
        name: form.name.trim(),
        enrollment_date: group.start_date ?? "",
      });
      closeAddStudentDialog();
    } catch (err) {
      setAddError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedStudents = filtered.filter((s) => selectedKeys.has(s.id));
  const hasSelection = selectedStudents.length > 0;
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((student) => selectedKeys.has(student.id));

  const handleSelectionChange = (studentId: number, checked: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (checked) next.add(studentId);
      else next.delete(studentId);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (checked) {
        filtered.forEach((student) => next.add(student.id));
      } else {
        filtered.forEach((student) => next.delete(student.id));
      }
      return next;
    });
  };

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
      closeBulkNoteDialog();
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
    <TooltipProvider>
      <div className="flex h-full flex-col px-6 py-6 pl-3">
        <Breadcrumb
          items={[
            { label: t("groups.breadcrumb"), onClick: onGoToGroups },
            { label: group.name },
            { label: t("attendance.studentsHeader") },
          ]}
        />

        <div className="mb-1">
          <h2 className="text-2xl font-bold">{t("students.title")}</h2>
        </div>

        <div className="mt-6 mb-4 flex items-center justify-between">
          {!loading && students.length > 0 && (
            <Input
              placeholder={t("students.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          )}

          <div className="ml-auto flex items-center gap-2">
            {hasSelection ? (
              <>
                <span className="text-sm text-muted">
                  {selectedStudents.length} {t("students.selected")}
                </span>
                <Button variant="secondary" size="sm" onClick={() => setBulkNoteOpen(true)}>
                  {t("students.addNote")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedKeys(new Set())}>
                  {t("students.clear")}
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => setAddStudentOpen(true)}>
                {t("students.addStudent")}
              </Button>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            {error}
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col">
          {!loading && !error && (
            <div className="flex h-full flex-1 flex-col overflow-hidden rounded-xl border bg-background">
              <div className="min-h-0 flex-1 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 pr-0">
                        <Checkbox
                          aria-label="Select all"
                          checked={allFilteredSelected}
                          onCheckedChange={(checked) => handleSelectAll(checked === true)}
                          disabled={filtered.length === 0}
                        />
                      </TableHead>
                      <TableHead>{t("students.tableColumns.name")}</TableHead>
                      <TableHead>{t("students.tableColumns.gender")}</TableHead>
                      <TableHead>{t("students.tableColumns.birthdate")}</TableHead>
                      <TableHead />
                      <TableHead>{t("students.tableColumns.studentId")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((student) => (
                      <TableRow
                        key={student.id}
                        className="cursor-pointer"
                        data-state={selectedKeys.has(student.id) ? "selected" : undefined}
                        onClick={() => onSelectStudent(student)}
                      >
                        <TableCell className="pr-0" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            aria-label={`Select ${student.name}`}
                            checked={selectedKeys.has(student.id)}
                            onCheckedChange={(checked) =>
                              handleSelectionChange(student.id, checked === true)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell className="text-sm text-foreground/50">
                          {student.gender || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-foreground/50">
                          {formatBirthdate(student.birthdate)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {student.has_special_education === 1 && (
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <button
                                      type="button"
                                      className="inline-flex size-5 items-center justify-center rounded-full bg-accent/10 text-accent"
                                    />
                                  }
                                >
                                  <GraduationCap size={10} />
                                </TooltipTrigger>
                                <TooltipContent>
                                  {t("students.badges.specialEducation")}
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {student.birthdate && isBirthdaySoon(student.birthdate) && (
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <button
                                      type="button"
                                      className="inline-flex size-5 items-center justify-center rounded-full bg-warning/10 text-warning"
                                    />
                                  }
                                >
                                  <Cake size={10} />
                                </TooltipTrigger>
                                <TooltipContent>
                                  {t("students.badges.birthdaySoon")}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-foreground/40">
                          {student.student_number || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {filtered.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
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
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <Dialog
          open={addStudentOpen}
          onOpenChange={(open) => {
            if (!open && !submitting) closeAddStudentDialog();
          }}
        >
          <DialogContent className="overflow-visible">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{t("students.addStudentModal.title")}</DialogTitle>
              </DialogHeader>

              <div className="flex flex-col gap-4 py-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="add-student-name">
                    {t("students.addStudentModal.nameLabel")}
                  </Label>
                  <Input
                    id="add-student-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={t("students.addStudentModal.namePlaceholder")}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>{t("students.addStudentModal.genderLabel")}</Label>
                  <Select
                    value={form.gender || undefined}
                    onValueChange={(gender) => setForm({ ...form, gender: gender ?? "" })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={t("students.addStudentModal.selectGender")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">
                        {t("students.addStudentModal.male")}
                      </SelectItem>
                      <SelectItem value="Female">
                        {t("students.addStudentModal.female")}
                      </SelectItem>
                      <SelectItem value="Other">
                        {t("students.addStudentModal.other")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <AppDatePicker
                  label={t("students.addStudentModal.birthdateLabel")}
                  value={form.birthdate}
                  onChange={(birthdate) => setForm({ ...form, birthdate })}
                  placeholder={t("students.addStudentModal.birthdateLabel")}
                />

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="add-student-number">
                    {t("students.addStudentModal.studentIdLabel")}
                  </Label>
                  <Input
                    id="add-student-number"
                    value={form.student_number}
                    onChange={(e) => setForm({ ...form, student_number: e.target.value })}
                    placeholder={t("students.addStudentModal.studentIdPlaceholder")}
                  />
                </div>

                {addError && <p className="text-sm text-danger">{addError}</p>}
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={closeAddStudentDialog}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    t("common.add")
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={bulkNoteOpen}
          onOpenChange={(open) => {
            if (!open && !noteSubmitting) closeBulkNoteDialog();
          }}
        >
          <DialogContent>
            <form onSubmit={handleBulkAddNote}>
              <DialogHeader>
                <DialogTitle>{bulkNoteTitle}</DialogTitle>
              </DialogHeader>

              <div className="flex flex-col gap-4 py-4">
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
                    className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
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
                        <Badge
                          key={tag}
                          variant={isActive ? "default" : "outline"}
                          className={cn(
                            "cursor-pointer transition-transform active:scale-95",
                            isActive
                              ? NOTE_TAG_COLORS[tag].active
                              : NOTE_TAG_COLORS[tag].inactive,
                          )}
                          onClick={() =>
                            setNoteTags((prev) =>
                              isActive
                                ? prev.filter((currentTag) => currentTag !== tag)
                                : [...prev, tag],
                            )
                          }
                        >
                          {t(`studentProfile.notes.tags.${tag}` as Parameters<typeof t>[0])}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                {noteError && <p className="text-sm text-danger">{noteError}</p>}
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={closeBulkNoteDialog}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={noteSubmitting || !noteContent.trim()}>
                  {noteSubmitting ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    t("common.add")
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
