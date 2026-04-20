import { useState } from "react";
import {
  Button,
  Modal,
  Label,
  Input,
  Spinner,
  useOverlayState,
} from "@heroui/react";
import { useTranslation } from "../i18n/LanguageContext";
import type { NewSchedulePeriodInput, DayOfWeek } from "../types/schedule";

interface AddPeriodModalProps {
  onAdd: (input: NewSchedulePeriodInput) => Promise<void>;
}

const ORDERED_DAYS: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAYS = new Set<DayOfWeek>([1, 2, 3, 4, 5]);

const emptyForm = { name: "", start_time: "08:00", end_time: "09:00" };

export function AddPeriodModal({ onAdd }: AddPeriodModalProps) {
  const modalState = useOverlayState();
  const { t } = useTranslation();
  const [form, setForm] = useState(emptyForm);
  const [selectedDays, setSelectedDays] = useState<Set<DayOfWeek>>(new Set(WEEKDAYS));
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const toggleDay = (day: DayOfWeek) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const applyWeekdays = () => setSelectedDays(new Set(WEEKDAYS));
  const applyAllDays = () => setSelectedDays(new Set(ORDERED_DAYS));

  const closeModal = () => {
    setForm(emptyForm);
    setSelectedDays(new Set(WEEKDAYS));
    setAddError(null);
    modalState.close();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (!form.start_time || !form.end_time) return;
    if (selectedDays.size === 0) {
      setAddError(t("schedule.addPeriodModal.selectAtLeastOneDay"));
      return;
    }
    setSubmitting(true);
    setAddError(null);
    try {
      await Promise.all(
        Array.from(selectedDays).map((day) =>
          onAdd({ day_of_week: day, name: form.name.trim(), start_time: form.start_time, end_time: form.end_time })
        )
      );
      setForm(emptyForm);
      setSelectedDays(new Set(WEEKDAYS));
      modalState.close();
    } catch (err) {
      setAddError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const addLabel = selectedDays.size > 1
    ? t("schedule.addPeriodModal.addButtonDays", { count: selectedDays.size })
    : t("schedule.addPeriodModal.addButton");

  return (
    <>
      <Button variant="primary" size="sm" onPress={modalState.open}>
        {t("schedule.addPeriodModal.triggerLabel")}
      </Button>

      <Modal state={modalState}>
        <Modal.Backdrop isDismissable={!submitting}>
          <Modal.Container>
            <Modal.Dialog>
              <form onSubmit={handleSubmit}>
                <Modal.Header>{t("schedule.addPeriodModal.title")}</Modal.Header>
                <Modal.Body className="flex flex-col gap-4 pb-px overflow-visible">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="period-name">{t("schedule.addPeriodModal.periodNameLabel")}</Label>
                    <Input
                      id="period-name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder={t("schedule.addPeriodModal.periodNamePlaceholder")}
                      required
                    />
                  </div>

                  <div className="flex gap-4">
                    <div className="flex flex-col gap-1.5 flex-1">
                      <Label htmlFor="period-start">{t("schedule.addPeriodModal.startTimeLabel")}</Label>
                      <input
                        id="period-start"
                        type="time"
                        value={form.start_time}
                        onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                        required
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1">
                      <Label htmlFor="period-end">{t("schedule.addPeriodModal.endTimeLabel")}</Label>
                      <input
                        id="period-end"
                        type="time"
                        value={form.end_time}
                        onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                        required
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <Label>{t("schedule.addPeriodModal.daysLabel")}</Label>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={applyWeekdays}
                          className="text-xs text-foreground/50 hover:text-foreground transition-colors px-1"
                        >
                          {t("schedule.addPeriodModal.weekdays")}
                        </button>
                        <span className="text-foreground/20 text-xs">·</span>
                        <button
                          type="button"
                          onClick={applyAllDays}
                          className="text-xs text-foreground/50 hover:text-foreground transition-colors px-1"
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
                            className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${
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

                  {addError && <p className="text-danger text-sm">{addError}</p>}
                </Modal.Body>
                <Modal.Footer>
                  <Button type="button" variant="ghost" onPress={closeModal}>
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" variant="primary" isDisabled={submitting || selectedDays.size === 0}>
                    {submitting ? <Spinner size="sm" /> : addLabel}
                  </Button>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
