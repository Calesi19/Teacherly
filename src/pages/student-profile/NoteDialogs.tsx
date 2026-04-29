import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useTranslation } from "../../i18n/LanguageContext";
import {
  NOTE_TAG_COLORS,
  NOTE_TAG_KEYS,
  parseTags,
  type Note,
  type NoteTagKey,
} from "../../types/note";
import { cn } from "@/lib/utils";
import { formatNoteTimestamp } from "./utils";

interface AddNoteDialogProps {
  open: boolean;
  noteContent: string;
  noteTags: NoteTagKey[];
  noteSubmitting: boolean;
  noteError: string | null;
  setNoteContent: (value: string) => void;
  setNoteTags: React.Dispatch<React.SetStateAction<NoteTagKey[]>>;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

export function AddNoteDialog({
  open,
  noteContent,
  noteTags,
  noteSubmitting,
  noteError,
  setNoteContent,
  setNoteTags,
  onClose,
  onSubmit,
}: AddNoteDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !noteSubmitting) onClose();
      }}
    >
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{t("studentProfile.addNoteModal.title")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="note-content">
                {t("studentProfile.addNoteModal.noteLabel")}
              </Label>
              <textarea
                id="note-content"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder={t("studentProfile.addNoteModal.notePlaceholder")}
                rows={4}
                required
                className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              />
            </div>
            <TagPicker
              title={t("studentProfile.addNoteModal.tagsLabel")}
              value={noteTags}
              onChange={setNoteTags}
            />
            {noteError ? <p className="text-sm text-danger">{noteError}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
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
  );
}

interface ViewNoteDialogProps {
  open: boolean;
  viewingNote: Note | null;
  isEditingNote: boolean;
  editNoteContent: string;
  editNoteTags: NoteTagKey[];
  editNoteSubmitting: boolean;
  editNoteError: string | null;
  setEditNoteContent: (value: string) => void;
  setEditNoteTags: React.Dispatch<React.SetStateAction<NoteTagKey[]>>;
  setIsEditingNote: (value: boolean) => void;
  onClose: () => void;
  onStartEditing: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

export function ViewNoteDialog({
  open,
  viewingNote,
  isEditingNote,
  editNoteContent,
  editNoteTags,
  editNoteSubmitting,
  editNoteError,
  setEditNoteContent,
  setEditNoteTags,
  setIsEditingNote,
  onClose,
  onStartEditing,
  onSubmit,
}: ViewNoteDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !editNoteSubmitting) onClose();
      }}
    >
      <DialogContent>
        {isEditingNote ? (
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>{t("notes.viewModal.editTitle")}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-note-content">
                  {t("studentProfile.addNoteModal.noteLabel")}
                </Label>
                <textarea
                  id="edit-note-content"
                  value={editNoteContent}
                  onChange={(e) => setEditNoteContent(e.target.value)}
                  rows={5}
                  required
                  className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                />
              </div>
              <TagPicker
                title={t("studentProfile.addNoteModal.tagsLabel")}
                value={editNoteTags}
                onChange={setEditNoteTags}
              />
              {editNoteError ? (
                <p className="text-sm text-danger">{editNoteError}</p>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={editNoteSubmitting}
                onClick={() => setIsEditingNote(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={editNoteSubmitting || !editNoteContent.trim()}
              >
                {editNoteSubmitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  t("common.save")
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("notes.viewModal.title")}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              {viewingNote && parseTags(viewingNote.tags).length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {parseTags(viewingNote.tags).map((tag) => (
                    <Badge key={tag} className={NOTE_TAG_COLORS[tag].chip}>
                      {t(`studentProfile.notes.tags.${tag}`)}
                    </Badge>
                  ))}
                </div>
              ) : null}
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {viewingNote?.content}
              </p>
              <p className="text-xs text-muted">
                {viewingNote ? formatNoteTimestamp(viewingNote.created_at) : ""}
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                {t("common.cancel")}
              </Button>
              <Button type="button" variant="secondary" onClick={onStartEditing}>
                <Pencil size={14} />
                {t("notes.viewModal.edit")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TagPicker({
  title,
  value,
  onChange,
}: {
  title: string;
  value: NoteTagKey[];
  onChange: React.Dispatch<React.SetStateAction<NoteTagKey[]>>;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{title}</span>
      <div className="flex flex-wrap gap-2">
        {NOTE_TAG_KEYS.map((tag) => {
          const isActive = value.includes(tag);
          return (
            <Badge
              key={tag}
              variant={isActive ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-transform active:scale-95",
                isActive ? NOTE_TAG_COLORS[tag].active : NOTE_TAG_COLORS[tag].inactive,
              )}
              onClick={() =>
                onChange((prev) =>
                  isActive ? prev.filter((item) => item !== tag) : [...prev, tag],
                )
              }
            >
              {t(`studentProfile.notes.tags.${tag}`)}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
