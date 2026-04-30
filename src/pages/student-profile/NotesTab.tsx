import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { TabsContent } from "@/components/ui/tabs";
import { useTranslation } from "../../i18n/LanguageContext";
import {
  NOTE_TAG_KEYS,
  NOTE_TAG_COLORS,
  parseTags,
  type Note,
  type NoteTagKey,
} from "../../types/note";
import { LoadingSpinner, TableEmptyState } from "./shared";
import { formatNoteTimestamp } from "./utils";

interface NotesTabProps {
  noteSearch: string;
  onNoteSearchChange: (value: string) => void;
  noteTagFilter: "all" | NoteTagKey;
  onNoteTagFilterChange: (value: "all" | NoteTagKey) => void;
  onOpenNote: () => void;
  loadingNotes: boolean;
  notes: Note[];
  filteredNotes: Note[];
  onOpenViewNote: (note: Note) => void;
}

export function NotesTab({
  noteSearch,
  onNoteSearchChange,
  noteTagFilter,
  onNoteTagFilterChange,
  onOpenNote,
  loadingNotes,
  notes,
  filteredNotes,
  onOpenViewNote,
}: NotesTabProps) {
  const { t } = useTranslation();

  return (
    <TabsContent value="notes" className="flex min-h-0 flex-1 flex-col gap-4 pt-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Input
            placeholder={t("studentProfile.notes.searchPlaceholder")}
            value={noteSearch}
            onChange={(e) => onNoteSearchChange(e.target.value)}
            className="max-w-xs"
          />
          <Select
            value={noteTagFilter}
            onValueChange={(value) =>
              onNoteTagFilterChange((value as "all" | NoteTagKey | null) ?? "all")
            }
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder={t("studentProfile.notes.tags.all")}>
                {noteTagFilter === "all"
                  ? t("studentProfile.notes.tags.all")
                  : t(`studentProfile.notes.tags.${noteTagFilter}`)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("studentProfile.notes.tags.all")}</SelectItem>
              {NOTE_TAG_KEYS.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {t(`studentProfile.notes.tags.${tag}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={onOpenNote}>
          {t("studentProfile.notes.addNote")}
        </Button>
      </div>

      {loadingNotes ? (
        <LoadingSpinner large />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-background">
          <div className="min-h-0 flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("studentProfile.notes.columns.note")}</TableHead>
                  <TableHead>{t("studentProfile.notes.columns.date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotes.map((note) => {
                  const tags = parseTags(note.tags);
                  return (
                    <TableRow
                      key={note.id}
                      className="cursor-pointer"
                      onClick={() => onOpenViewNote(note)}
                    >
                      <TableCell className="max-w-md whitespace-pre-wrap text-sm text-foreground">
                        {tags.length > 0 ? (
                          <div className="mb-1.5 flex flex-wrap gap-1">
                            {tags.map((tag) => (
                              <Badge key={tag} className={NOTE_TAG_COLORS[tag].chip}>
                                {t(`studentProfile.notes.tags.${tag}`)}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                        {note.content}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-foreground/50">
                        {formatNoteTimestamp(note.created_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filteredNotes.length === 0 ? (
              <TableEmptyState
                title={
                  notes.length === 0
                    ? t("studentProfile.notes.noNotes")
                    : t("studentProfile.notes.noResults")
                }
                hint={
                  notes.length === 0
                    ? t("studentProfile.notes.noNotesHint")
                    : t("studentProfile.notes.noResultsHint", {
                        search: noteSearch,
                      })
                }
              />
            ) : null}
          </div>
        </div>
      )}
    </TabsContent>
  );
}
