import { useState } from "react";
import {
  Button,
  Modal,
  Label,
  Spinner,
  useOverlayState,
} from "@heroui/react";
import { useNotes } from "../hooks/useNotes";
import { Breadcrumb } from "../components/Breadcrumb";
import { useTranslation } from "../i18n/LanguageContext";
import type { Group } from "../types/group";
import type { Student } from "../types/student";
import type { NewNoteInput } from "../types/note";

interface NotesPageProps {
  student: Student;
  group: Group;
  onGoToGroups: () => void;
  onGoToStudents: () => void;
  onGoToStudentProfile: () => void;
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function NotesPage({
  student,
  group,
  onGoToGroups,
  onGoToStudents,
  onGoToStudentProfile,
}: NotesPageProps) {
  const { notes, loading, error, addNote } = useNotes(student.id);
  const { t } = useTranslation();
  const modalState = useOverlayState();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const closeModal = () => {
    setContent("");
    setAddError(null);
    modalState.close();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setAddError(null);
    try {
      const input: NewNoteInput = { content: content.trim() };
      await addNote(input);
      setContent("");
      modalState.close();
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
          { label: t("notes.breadcrumb") },
        ]}
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{t("notes.title")}</h2>
          <p className="text-sm text-muted">{student.name}</p>
        </div>
        <Button variant="primary" size="sm" onPress={modalState.open}>
          {t("notes.addNote")}
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

      {!loading && !error && notes.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 text-center">
          <p className="text-lg font-semibold text-muted">{t("notes.noNotesYet")}</p>
          <p className="text-sm text-foreground/40 mt-1">{t("notes.noNotesHint")}</p>
        </div>
      )}

      {!loading && notes.length > 0 && (
        <div className="flex flex-col gap-3">
          {notes.map((note) => (
            <div key={note.id} className="rounded-2xl bg-background-secondary p-4 flex flex-col gap-1">
              <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
              <p className="text-xs text-muted">{formatTimestamp(note.created_at)}</p>
            </div>
          ))}
        </div>
      )}

      <Modal state={modalState}>
        <Modal.Backdrop isDismissable={!submitting}>
          <Modal.Container>
            <Modal.Dialog>
              <form onSubmit={handleSubmit}>
                <Modal.Header>{t("notes.modal.title")}</Modal.Header>
                <Modal.Body className="flex flex-col gap-4 pb-px overflow-visible">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="note-content">{t("notes.modal.noteLabel")}</Label>
                    <textarea
                      id="note-content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder={t("notes.modal.notePlaceholder")}
                      rows={4}
                      required
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
                  <Button type="submit" variant="primary" isDisabled={submitting || !content.trim()}>
                    {submitting ? <Spinner size="sm" /> : t("common.add")}
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
