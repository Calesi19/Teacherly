import { useState, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useSchedule } from "../hooks/useSchedule";
import { useTranslation } from "../i18n/LanguageContext";
import type { AssignmentTag, NewAssignmentInput } from "../types/assignment";

interface AddAssignmentModalProps {
  groupId: number;
  onAdd: (input: NewAssignmentInput) => Promise<void>;
}

const TAG_OPTIONS: AssignmentTag[] = ["Exam", "Quiz", "Homework", "Extra Credit", "Project", "Other"];

function todayLocalDateString() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function makeEmptyForm() {
  return {
    title: "",
    description: "",
    max_score: "",
    period_name: "",
    assigned_date: todayLocalDateString(),
    tag: "",
  };
}

export function AddAssignmentModal({ groupId, onAdd }: AddAssignmentModalProps) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const [form, setForm] = useState(makeEmptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const { periods } = useSchedule(groupId);

  const uniquePeriodNames = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const p of periods) {
      if (!seen.has(p.name)) {
        seen.add(p.name);
        result.push(p.name);
      }
    }
    return result;
  }, [periods]);

  const closeModal = () => {
    setForm(makeEmptyForm());
    setAddError(null);
    setOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedMax = parseFloat(form.max_score);
    if (!form.title.trim() || isNaN(parsedMax) || parsedMax <= 0 || !form.period_name || !form.tag) return;
    setSubmitting(true);
    setAddError(null);
    try {
      await onAdd({
        title: form.title.trim(),
        description: form.description.trim(),
        max_score: parsedMax,
        period_name: form.period_name,
        assigned_date: form.assigned_date,
        tag: form.tag as AssignmentTag,
      });
      setForm(makeEmptyForm());
      setOpen(false);
    } catch (err) {
      setAddError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const tagLabels: Record<AssignmentTag, string> = {
    Exam: t("assignments.tags.exam"),
    Quiz: t("assignments.tags.quiz"),
    Homework: t("assignments.tags.homework"),
    "Extra Credit": t("assignments.tags.extraCredit"),
    Project: t("assignments.tags.project"),
    Other: t("assignments.tags.other"),
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        {t("assignments.addModal.triggerLabel")}
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!o && !submitting) closeModal(); }}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{t("assignments.addModal.title")}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assignment-title">{t("assignments.addModal.titleLabel")}</Label>
                <Input
                  id="assignment-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder={t("assignments.addModal.titlePlaceholder")}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assignment-description">{t("assignments.addModal.descriptionLabel")}</Label>
                <textarea
                  id="assignment-description"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={t("assignments.addModal.descriptionPlaceholder")}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assignment-max-score">{t("assignments.addModal.maxScoreLabel")}</Label>
                <input
                  id="assignment-max-score"
                  type="number"
                  min="0"
                  step="any"
                  value={form.max_score}
                  onChange={(e) => setForm({ ...form, max_score: e.target.value })}
                  placeholder={t("assignments.addModal.maxScorePlaceholder")}
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <AppDatePicker
                label={t("assignments.addModal.dateLabel")}
                value={form.assigned_date}
                onChange={(value) => setForm({ ...form, assigned_date: value })}
                placeholder={t("assignments.addModal.datePlaceholder")}
              />

              <div className="flex flex-col gap-1.5">
                <Label>{t("assignments.addModal.periodLabel")}</Label>
                {uniquePeriodNames.length === 0 ? (
                  <select
                    disabled
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm opacity-50 cursor-not-allowed"
                  >
                    <option>{t("assignments.addModal.noPeriods")}</option>
                  </select>
                ) : (
                  <Select
                    value={form.period_name || undefined}
                    onValueChange={(val) => setForm({ ...form, period_name: val ?? "" })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("assignments.addModal.selectPeriod")}>
                        {form.period_name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {uniquePeriodNames.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>{t("assignments.addModal.tagLabel")}</Label>
                <div className="flex flex-wrap gap-2">
                  {TAG_OPTIONS.map((tag) => {
                    const isSelected = form.tag === tag;
                    return (
                      <Badge
                        key={tag}
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer transition-transform active:scale-95",
                          isSelected ? "" : "text-foreground/60 hover:text-foreground"
                        )}
                        onClick={() => setForm({ ...form, tag })}
                      >
                        {tagLabels[tag]}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {addError && <p className="text-danger text-sm">{addError}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={closeModal}>
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                  disabled={
                    submitting ||
                    !form.title.trim() ||
                    !form.max_score ||
                    !form.period_name ||
                    !form.assigned_date ||
                    !form.tag ||
                    uniquePeriodNames.length === 0
                  }
              >
                {submitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  t("assignments.addModal.addButton")
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
