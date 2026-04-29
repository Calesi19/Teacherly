import { Button } from "@/components/ui/button";
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
import { AppDatePicker } from "@/components/ui/app-date-picker";
import { useTranslation } from "../../i18n/LanguageContext";
import type { Contact } from "../../types/contact";

interface VisitationDialogProps {
  open: boolean;
  visitSubmitting: boolean;
  contacts: Contact[];
  selectedVisitorKey: string | null;
  setSelectedVisitorKey: (value: string | null) => void;
  newVisitorName: string;
  setNewVisitorName: (value: string) => void;
  isNewVisitor: boolean;
  visitNotes: string;
  setVisitNotes: (value: string) => void;
  visitedAt: string;
  setVisitedAt: (value: string) => void;
  visitError: string | null;
  canSubmitVisitation: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

export function VisitationDialog({
  open,
  visitSubmitting,
  contacts,
  selectedVisitorKey,
  setSelectedVisitorKey,
  newVisitorName,
  setNewVisitorName,
  isNewVisitor,
  visitNotes,
  setVisitNotes,
  visitedAt,
  setVisitedAt,
  visitError,
  canSubmitVisitation,
  onClose,
  onSubmit,
}: VisitationDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !visitSubmitting) onClose();
      }}
    >
      <DialogContent className="overflow-visible">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{t("studentProfile.logVisitationModal.title")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <Label>{t("studentProfile.logVisitationModal.visitorLabel")}</Label>
              <Select
                value={selectedVisitorKey ?? undefined}
                onValueChange={(value) => {
                  setSelectedVisitorKey(value ?? null);
                  setNewVisitorName("");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={t("studentProfile.logVisitationModal.selectVisitor")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={String(contact.id)}>
                      <div className="flex flex-col">
                        <span className="text-sm">{contact.name}</span>
                        {contact.relationship ? (
                          <span className="text-xs text-foreground/50">
                            {contact.relationship}
                          </span>
                        ) : null}
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem value="new">
                    <span className="text-accent text-sm">
                      {t("studentProfile.logVisitationModal.newVisitor")}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isNewVisitor ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="visit-new-name">
                  {t("studentProfile.logVisitationModal.visitorNameLabel")}
                </Label>
                <Input
                  id="visit-new-name"
                  value={newVisitorName}
                  onChange={(e) => setNewVisitorName(e.target.value)}
                  placeholder={t(
                    "studentProfile.logVisitationModal.visitorNamePlaceholder",
                  )}
                  autoFocus
                />
                <p className="text-xs text-accent">
                  {t("studentProfile.logVisitationModal.newContactHint")}
                </p>
              </div>
            ) : null}

            <AppDatePicker
              label={t("studentProfile.logVisitationModal.dateLabel")}
              value={visitedAt}
              onChange={setVisitedAt}
              placeholder={t("studentProfile.logVisitationModal.dateLabel")}
            />

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="visit-notes">
                {t("studentProfile.logVisitationModal.notesLabel")}
              </Label>
              <textarea
                id="visit-notes"
                value={visitNotes}
                onChange={(e) => setVisitNotes(e.target.value)}
                placeholder={t("studentProfile.logVisitationModal.notesPlaceholder")}
                rows={4}
                className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              />
            </div>

            {visitError ? <p className="text-sm text-danger">{visitError}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!canSubmitVisitation}>
              {visitSubmitting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                t("common.log")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
