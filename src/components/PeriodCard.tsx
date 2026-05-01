import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trash2, Pencil } from "lucide-react";
import { ConfirmModal } from "./ConfirmModal";
import { useTranslation } from "../i18n/LanguageContext";
import type {
  CourseSummary,
  DayOfWeek,
  NewSchedulePeriodInput,
} from "../types/schedule";

interface PeriodCardProps {
  course: CourseSummary;
  onDelete: (name: string) => void;
  onEdit: (name: string, data: NewSchedulePeriodInput) => Promise<void>;
}

const ORDERED_DAYS: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAYS = new Set<DayOfWeek>([1, 2, 3, 4, 5]);

export function PeriodCard({ course, onDelete, onEdit }: PeriodCardProps) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(course.name);
  const [selectedDays, setSelectedDays] = useState<Set<DayOfWeek>>(
    new Set(course.days),
  );
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const openEdit = () => {
    setEditName(course.name);
    setSelectedDays(new Set(course.days));
    setEditError(null);
    setEditOpen(true);
  };

  const toggleDay = (day: DayOfWeek) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    if (selectedDays.size === 0) {
      setEditError(t("schedule.addPeriodModal.selectAtLeastOneDay"));
      return;
    }

    setSaving(true);
    setEditError(null);
    try {
      await onEdit(course.name, {
        name: editName.trim(),
        days: Array.from(selectedDays),
      });
      setEditOpen(false);
    } catch (err) {
      setEditError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{course.name}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {course.days.map((day) => (
              <span
                key={day}
                className="rounded-md bg-accent/10 px-2 py-1 text-xs font-medium text-accent"
              >
                {t(`schedule.dayShort.${day}`)}
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("schedule.editPeriodModal.title")}
            onClick={openEdit}
          >
            <Pencil size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("schedule.deletePeriodModal.title")}
            onClick={() => setConfirming(true)}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={(o) => {
          if (!o && !saving) setEditOpen(false);
        }}
      >
        <DialogContent>
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>{t("schedule.editPeriodModal.title")}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-period-name">
                  {t("schedule.editPeriodModal.periodNameLabel")}
                </Label>
                <input
                  id="edit-period-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label>{t("schedule.addPeriodModal.daysLabel")}</Label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedDays(new Set(WEEKDAYS))}
                      className="px-1 text-xs text-foreground/50 transition-colors hover:text-foreground"
                    >
                      {t("schedule.addPeriodModal.weekdays")}
                    </button>
                    <span className="text-xs text-foreground/20">·</span>
                    <button
                      type="button"
                      onClick={() => setSelectedDays(new Set(ORDERED_DAYS))}
                      className="px-1 text-xs text-foreground/50 transition-colors hover:text-foreground"
                    >
                      {t("schedule.addPeriodModal.everyDay")}
                    </button>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {ORDERED_DAYS.map((day) => {
                    const active = selectedDays.has(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                          active
                            ? "bg-accent text-white"
                            : "bg-foreground/5 text-foreground/50 hover:bg-foreground/10"
                        }`}
                      >
                        {t(`schedule.dayShort.${day}`)}
                      </button>
                    );
                  })}
                </div>
              </div>
              {editError && <p className="text-sm text-danger">{editError}</p>}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditOpen(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={saving || selectedDays.size === 0}>
                {saving ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  t("common.save")
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => onDelete(course.name)}
        title={t("schedule.deletePeriodModal.title")}
        description={t("schedule.deletePeriodModal.description", {
          name: course.name,
        })}
        confirmLabel={t("common.delete")}
      />
    </>
  );
}
