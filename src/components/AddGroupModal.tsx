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
import { useTranslation } from "../i18n/LanguageContext";
import type { NewGroupInput } from "../types/group";

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

const emptyForm: NewGroupInput = {
  name: "",
  grade: "",
  school_name: "",
  start_date: "",
  end_date: "",
};

interface AddGroupModalProps {
  onAdd: (input: NewGroupInput) => Promise<void>;
}

export function AddGroupModal({ onAdd }: AddGroupModalProps) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const [form, setForm] = useState<NewGroupInput>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setForm(emptyForm);
    setError(null);
    setOpen(false);
  };

  const handleGradeSelect = (grade: string) => {
    setForm((prev) => ({
      ...prev,
      grade: prev.grade === grade ? "" : grade,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onAdd(form);
      close();
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        {t("groups.addGroup")}
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!o && !submitting) close(); }}>
        <DialogContent className="overflow-visible">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{t("groups.addGroupModal.title")}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="add-group-name">
                  {t("groups.addGroupModal.nameLabel")}
                </Label>
                <Input
                  id="add-group-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t("groups.addGroupModal.namePlaceholder")}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>{t("groups.addGroupModal.gradeLabel")}</Label>
                <div className="flex flex-wrap gap-2">
                  {GRADE_OPTIONS.map((grade) => {
                    const isSelected = form.grade === grade;
                    return (
                      <Badge
                        key={grade}
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer transition-transform active:scale-95",
                          isSelected ? "" : "text-foreground/60 hover:text-foreground"
                        )}
                        onClick={() => handleGradeSelect(grade)}
                      >
                        {t(`groups.addGroupModal.grades.${grade}`)}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <AppDatePicker
                label={t("groups.addGroupModal.startDateLabel")}
                value={form.start_date}
                onChange={(val) => setForm({ ...form, start_date: val })}
              />

              <AppDatePicker
                label={t("groups.addGroupModal.endDateLabel")}
                value={form.end_date}
                minValue={form.start_date}
                onChange={(val) => setForm({ ...form, end_date: val })}
              />

              {error && <p className="text-danger text-sm">{error}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={close}>
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
    </>
  );
}
