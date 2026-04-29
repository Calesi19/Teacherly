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
import type { SchedulePeriod } from "../types/schedule";

export function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${suffix}`;
}

interface PeriodCardProps {
  period: SchedulePeriod;
  onDelete: (id: number) => void;
  onEdit: (id: number, data: { name: string; start_time: string; end_time: string }) => Promise<void>;
  compact?: boolean;
}

export function PeriodCard({ period, onDelete, onEdit, compact = false }: PeriodCardProps) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: period.name, start_time: period.start_time, end_time: period.end_time });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const openEdit = () => {
    setEditForm({ name: period.name, start_time: period.start_time, end_time: period.end_time });
    setEditError(null);
    setEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim()) return;
    setSaving(true);
    setEditError(null);
    try {
      await onEdit(period.id, editForm);
      setEditOpen(false);
    } catch (err) {
      setEditError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const editModal = (
    <>
      <Dialog open={editOpen} onOpenChange={(o) => { if (!o && !saving) setEditOpen(false); }}>
        <DialogContent>
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>{t("schedule.editPeriodModal.title")}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-period-name">{t("schedule.editPeriodModal.periodNameLabel")}</Label>
                <input
                  id="edit-period-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex flex-col gap-1.5 flex-1">
                  <Label htmlFor="edit-period-start">{t("schedule.editPeriodModal.startTimeLabel")}</Label>
                  <input
                    id="edit-period-start"
                    type="time"
                    value={editForm.start_time}
                    onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <Label htmlFor="edit-period-end">{t("schedule.editPeriodModal.endTimeLabel")}</Label>
                  <input
                    id="edit-period-end"
                    type="time"
                    value={editForm.end_time}
                    onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>
              {editError && <p className="text-danger text-sm">{editError}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>{t("common.cancel")}</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => onDelete(period.id)}
        title={t("schedule.deletePeriodModal.title")}
        description={t("schedule.deletePeriodModal.description", { name: period.name })}
        confirmLabel={t("common.delete")}
      />
    </>
  );

  if (compact) {
    return (
      <>
        <div className="group relative h-full rounded-lg bg-accent/10 border border-accent/25 px-2 py-1.5 text-xs overflow-hidden hover:bg-accent/15 hover:border-accent/40 transition-colors">
          <div className="font-semibold text-foreground truncate pr-7 leading-tight">{period.name}</div>
          <div className="text-foreground/50 mt-0.5 font-mono leading-tight truncate">
            {formatTime(period.start_time)} – {formatTime(period.end_time)}
          </div>
          <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5">
            <button
              type="button"
              onClick={openEdit}
              className="p-0.5 rounded text-foreground/40 hover:text-foreground transition-colors"
              aria-label={t("schedule.editPeriodModal.title")}
            >
              <Pencil size={11} />
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="p-0.5 rounded text-foreground/40 hover:text-danger transition-colors"
              aria-label={t("schedule.deletePeriodModal.title")}
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>
        {editModal}
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-background border border-border/60">
        <span className="text-xs font-mono text-foreground/50 w-28 shrink-0">
          {formatTime(period.start_time)} – {formatTime(period.end_time)}
        </span>
        <span className="flex-1 font-medium text-sm">{period.name}</span>
        <button
          type="button"
          onClick={openEdit}
          className="p-1.5 rounded text-foreground/30 hover:text-foreground/70 transition-colors"
          aria-label={t("schedule.editPeriodModal.title")}
        >
          <Pencil size={14} />
        </button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("schedule.deletePeriodModal.title")}
          onClick={() => setConfirming(true)}
        >
          <Trash2 size={14} />
        </Button>
      </div>
      {editModal}
    </>
  );
}
