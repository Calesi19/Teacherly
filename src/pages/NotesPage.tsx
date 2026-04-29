import { useState } from "react";
import {
  Button,
  Input,
  Modal,
  Label,
  ListBox,
  Select,
  Spinner,
  useOverlayState,
} from "@heroui/react";
import { Pencil } from "lucide-react";
import { useNotes } from "../hooks/useNotes";
import { Breadcrumb } from "../components/Breadcrumb";
import { useTranslation } from "../i18n/LanguageContext";
import type { Group } from "../types/group";
import type { Student } from "../types/student";
import type { Note, NewNoteInput, NoteTagKey } from "../types/note";
import { NOTE_TAG_KEYS, NOTE_TAG_COLORS, parseTags, serializeTags } from "../types/note";

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
  const { notes, loading, error, addNote, updateNote } = useNotes(student.id);
  const { t } = useTranslation();
  const modalState = useOverlayState();
  const viewModalState = useOverlayState();
  const [content, setContent] = useState("");
  const [selectedTags, setSelectedTags] = useState<NoteTagKey[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<"all" | NoteTagKey>("all");
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState<NoteTagKey[]>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const closeModal = () => {
    setContent("");
    setSelectedTags([]);
    setAddError(null);
    modalState.close();
  };

  const openViewModal = (note: Note) => {
    setViewingNote(note);
    setIsEditing(false);
    setEditError(null);
    viewModalState.open();
  };

  const closeViewModal = () => {
    setIsEditing(false);
    setEditError(null);
    viewModalState.close();
  };

  const startEditing = () => {
    if (!viewingNote) return;
    setEditContent(viewingNote.content);
    setEditTags(parseTags(viewingNote.tags));
    setEditError(null);
    setIsEditing(true);
  };

  const toggleEditTag = (tag: NoteTagKey) => {
    setEditTags((prev) =>
      prev.includes(tag) ? prev.filter((k) => k !== tag) : [...prev, tag]
    );
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingNote || !editContent.trim()) return;
    setEditSubmitting(true);
    setEditError(null);
    try {
      await updateNote(viewingNote.id, { content: editContent.trim(), tags: serializeTags(editTags) });
      setViewingNote((prev) => prev ? { ...prev, content: editContent.trim(), tags: serializeTags(editTags) } : prev);
      setIsEditing(false);
    } catch (err) {
      setEditError(String(err));
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setAddError(null);
    try {
      const input: NewNoteInput = { content: content.trim(), tags: serializeTags(selectedTags) };
      await addNote(input);
      closeModal();
    } catch (err) {
      setAddError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTag = (tag: NoteTagKey) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((k) => k !== tag) : [...prev, tag]
    );
  };

  const tagLabel = (tag: NoteTagKey) =>
    t(`studentProfile.notes.tags.${tag}` as Parameters<typeof t>[0]);

  const filteredNotes = notes.filter((n) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || n.content.toLowerCase().includes(q) || n.tags.toLowerCase().includes(q);
    const matchesTag = tagFilter === "all" || parseTags(n.tags).includes(tagFilter);
    return matchesSearch && matchesTag;
  });

  return (
    <div className="flex h-full flex-col px-6 pt-6 pb-6 pl-3">
      <Breadcrumb
        items={[
          { label: t("groups.breadcrumb"), onClick: onGoToGroups },
          { label: group.name, onClick: onGoToStudents },
          { label: student.name, onClick: onGoToStudentProfile },
          { label: t("notes.breadcrumb") },
        ]}
      />

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">{t("notes.title")}</h2>
          <p className="text-sm text-muted">{student.name}</p>
        </div>
        <Button variant="primary" size="sm" onPress={modalState.open}>
          {t("notes.addNote")}
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Input
          placeholder={t("studentProfile.notes.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          aria-label={t("studentProfile.notes.tags.label")}
          selectedKey={tagFilter}
          onSelectionChange={(key) => setTagFilter(key as "all" | NoteTagKey)}
          className="w-36"
        >
          <Select.Trigger>
            <Select.Value>
              {({ selectedText, isPlaceholder }) =>
                isPlaceholder ? t("studentProfile.notes.tags.all") : selectedText
              }
            </Select.Value>
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="all" textValue={t("studentProfile.notes.tags.all")}>
                {t("studentProfile.notes.tags.all")}
              </ListBox.Item>
              {NOTE_TAG_KEYS.map((tag) => (
                <ListBox.Item key={tag} id={tag} textValue={tagLabel(tag)}>
                  {tagLabel(tag)}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
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

      {!loading && !error && notes.length > 0 && filteredNotes.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 text-center">
          <p className="text-lg font-semibold text-muted">{t("studentProfile.notes.noResults")}</p>
        </div>
      )}

      {!loading && filteredNotes.length > 0 && (
        <div className="flex flex-col gap-3">
          {filteredNotes.map((note) => {
            const noteTags = parseTags(note.tags);
            return (
              <button
                key={note.id}
                type="button"
                onClick={() => openViewModal(note)}
                className="rounded-2xl bg-background-secondary p-4 flex flex-col gap-1.5 text-left hover:bg-background-secondary/70 transition-colors cursor-pointer w-full"
              >
                {noteTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {noteTags.map((tag) => (
                      <span
                        key={tag}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${NOTE_TAG_COLORS[tag].chip}`}
                      >
                        {tagLabel(tag)}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-3">{note.content}</p>
                <p className="text-xs text-muted">{formatTimestamp(note.created_at)}</p>
              </button>
            );
          })}
        </div>
      )}

      <Modal state={viewModalState}>
        <Modal.Backdrop isDismissable={!editSubmitting}>
          <Modal.Container>
            <Modal.Dialog>
              {isEditing ? (
                <form onSubmit={handleEditSubmit}>
                  <Modal.Header>{t("notes.viewModal.editTitle")}</Modal.Header>
                  <Modal.Body className="flex flex-col gap-4 pb-px overflow-visible">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="edit-note-content">{t("notes.modal.noteLabel")}</Label>
                      <textarea
                        id="edit-note-content"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={5}
                        required
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium">{t("notes.modal.tagsLabel")}</span>
                      <div className="flex flex-wrap gap-2">
                        {NOTE_TAG_KEYS.map((tag) => {
                          const isActive = editTags.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => toggleEditTag(tag)}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                isActive ? NOTE_TAG_COLORS[tag].active : NOTE_TAG_COLORS[tag].inactive
                              }`}
                            >
                              {tagLabel(tag)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {editError && <p className="text-danger text-sm">{editError}</p>}
                  </Modal.Body>
                  <Modal.Footer>
                    <Button type="button" variant="ghost" onPress={() => setIsEditing(false)} isDisabled={editSubmitting}>
                      {t("common.cancel")}
                    </Button>
                    <Button type="submit" variant="primary" isDisabled={editSubmitting || !editContent.trim()}>
                      {editSubmitting ? <Spinner size="sm" /> : t("common.save")}
                    </Button>
                  </Modal.Footer>
                </form>
              ) : (
                <>
                  <Modal.Header>{t("notes.viewModal.title")}</Modal.Header>
                  <Modal.Body className="flex flex-col gap-4 pb-px overflow-visible">
                    {viewingNote && parseTags(viewingNote.tags).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {parseTags(viewingNote.tags).map((tag) => (
                          <span
                            key={tag}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${NOTE_TAG_COLORS[tag].chip}`}
                          >
                            {tagLabel(tag)}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-foreground whitespace-pre-wrap">{viewingNote?.content}</p>
                    <p className="text-xs text-muted">{viewingNote ? formatTimestamp(viewingNote.created_at) : ""}</p>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button type="button" variant="ghost" onPress={closeViewModal}>
                      {t("common.cancel")}
                    </Button>
                    <Button type="button" variant="secondary" onPress={startEditing}>
                      <Pencil size={14} />
                      {t("notes.viewModal.edit")}
                    </Button>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

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
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium">{t("notes.modal.tagsLabel")}</span>
                    <div className="flex flex-wrap gap-2">
                      {NOTE_TAG_KEYS.map((tag) => {
                        const isActive = selectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                              isActive ? NOTE_TAG_COLORS[tag].active : NOTE_TAG_COLORS[tag].inactive
                            }`}
                          >
                            {tagLabel(tag)}
                          </button>
                        );
                      })}
                    </div>
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
