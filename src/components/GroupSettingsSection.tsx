import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AppDatePicker } from "@/components/ui/app-date-picker";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { useGroups } from "../hooks/useGroups";
import { useTranslation } from "../i18n/LanguageContext";
import type { Group } from "../types/group";

const GRADE_OPTIONS = [
  "Preschool",
  "Kindergarten",
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
  "10th",
  "11th",
  "12th",
  "Adult",
];

interface GroupSettingsSectionProps {
  group: Group;
  onGoToGroups: () => void;
  onSaved?: () => void;
}

export function GroupSettingsSection({
  group,
  onGoToGroups,
  onSaved,
}: GroupSettingsSectionProps) {
  const { t } = useTranslation();
  const { updateGroup, deleteGroup } = useGroups();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [name, setName] = useState(group.name);
  const [schoolName, setSchoolName] = useState(group.school_name ?? "");
  const [grade, setGrade] = useState(group.grade ?? "");
  const [startDate, setStartDate] = useState(group.start_date ?? "");
  const [endDate, setEndDate] = useState(group.end_date ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const CONFIRM_PHRASE = t("groups.editGroup.confirmPhrase");

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteGroup(group.id);
      setDeleteOpen(false);
      onGoToGroups();
    } catch (e) {
      setSaveError(String(e));
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    setSaveError(null);
    setSaved(false);
    try {
      await updateGroup(group.id, {
        name: name.trim(),
        grade,
        school_name: schoolName,
        start_date: startDate,
        end_date: endDate,
      });
      setSaved(true);
      onSaved?.();
    } catch (e) {
      setSaveError(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{t("groups.editGroup.title")}</p>
          {saved && !saveError && (
            <p className="text-xs text-success mt-0.5">{t("groups.editGroup.savedConfirmation")}</p>
          )}
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={submitting || !name.trim()}
        >
          {submitting ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            t("common.save")
          )}
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="settings-group-name">
          {t("groups.addGroupModal.nameLabel")}
        </Label>
        <Input
          id="settings-group-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("groups.addGroupModal.namePlaceholder")}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="settings-group-school">
          {t("groups.addGroupModal.schoolNameLabel")}
        </Label>
        <Input
          id="settings-group-school"
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          placeholder={t("groups.addGroupModal.schoolNamePlaceholder")}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t("groups.addGroupModal.gradeLabel")}</Label>
        <div className="flex flex-wrap gap-2">
          {GRADE_OPTIONS.map((option) => {
            const isSelected = grade === option;
            return (
              <Badge
                key={option}
                variant={isSelected ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-transform active:scale-95",
                  isSelected ? "" : "text-foreground/60 hover:text-foreground"
                )}
                onClick={() => setGrade(isSelected ? "" : option)}
              >
                {t(`groups.addGroupModal.grades.${option}`)}
              </Badge>
            );
          })}
        </div>
      </div>

      <AppDatePicker
        label={t("groups.addGroupModal.startDateLabel")}
        value={startDate}
        onChange={setStartDate}
      />

      <AppDatePicker
        label={t("groups.addGroupModal.endDateLabel")}
        value={endDate}
        minValue={startDate}
        onChange={setEndDate}
      />

      {saveError && <p className="text-danger text-sm">{saveError}</p>}

      <hr className="border-border" />

      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-semibold text-danger">
            {t("groups.editGroup.dangerZoneTitle")}
          </p>
          <p className="text-sm text-foreground/60 mt-0.5">
            {t("groups.editGroup.dangerZoneDescription")}
          </p>
        </div>
        <Button
          variant="destructive"
          onClick={() => setDeleteOpen(true)}
          className="w-full"
        >
          <Trash2 size={16} />
          {t("groups.editGroup.deleteButton")}
        </Button>
      </div>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmText("");
          setDeleteOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("groups.editGroup.deleteTitle")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-foreground/70">
              {t("groups.editGroup.deleteDescription")}
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="settings-delete-confirm">
                {t("groups.editGroup.deleteConfirmLabel", {
                  phrase: CONFIRM_PHRASE,
                })}
              </Label>
              <Input
                id="settings-delete-confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={CONFIRM_PHRASE}
                disabled={deleting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={deleting}
              onClick={() => {
                setDeleteOpen(false);
                setDeleteConfirmText("");
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting || deleteConfirmText !== CONFIRM_PHRASE}
              onClick={handleDelete}
            >
              {deleting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                t("common.delete")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
