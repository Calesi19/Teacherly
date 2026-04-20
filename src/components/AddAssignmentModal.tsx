import { useState, useMemo } from "react";
import {
  Button,
  Modal,
  Label,
  Input,
  Select,
  ListBox,
  Spinner,
  useOverlayState,
} from "@heroui/react";
import { useSchedule } from "../hooks/useSchedule";
import { useTranslation } from "../i18n/LanguageContext";
import type { NewAssignmentInput } from "../types/assignment";

interface AddAssignmentModalProps {
  groupId: number;
  onAdd: (input: NewAssignmentInput) => Promise<void>;
}

const emptyForm = { title: "", description: "", max_score: "", period_name: "" };

export function AddAssignmentModal({ groupId, onAdd }: AddAssignmentModalProps) {
  const modalState = useOverlayState();
  const { t } = useTranslation();
  const [form, setForm] = useState(emptyForm);
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
    setForm(emptyForm);
    setAddError(null);
    modalState.close();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedMax = parseFloat(form.max_score);
    if (!form.title.trim() || isNaN(parsedMax) || parsedMax <= 0 || !form.period_name) return;
    setSubmitting(true);
    setAddError(null);
    try {
      await onAdd({
        title: form.title.trim(),
        description: form.description.trim(),
        max_score: parsedMax,
        period_name: form.period_name,
      });
      setForm(emptyForm);
      modalState.close();
    } catch (err) {
      setAddError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button variant="primary" size="sm" onPress={modalState.open}>
        {t("assignments.addModal.triggerLabel")}
      </Button>

      <Modal state={modalState}>
        <Modal.Backdrop isDismissable={!submitting}>
          <Modal.Container>
            <Modal.Dialog>
              <form onSubmit={handleSubmit}>
                <Modal.Header>{t("assignments.addModal.title")}</Modal.Header>
                <Modal.Body className="flex flex-col gap-4 pb-px overflow-visible">
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
                        aria-label={t("assignments.addModal.periodLabel")}
                        selectedKey={form.period_name || null}
                        onSelectionChange={(key) =>
                          setForm({ ...form, period_name: String(key) })
                        }
                      >
                        <Select.Trigger className="w-full">
                          <Select.Value>
                            {({ isPlaceholder }) =>
                              isPlaceholder ? (
                                <span className="text-foreground/40">{t("assignments.addModal.selectPeriod")}</span>
                              ) : (
                                <span>{form.period_name}</span>
                              )
                            }
                          </Select.Value>
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {uniquePeriodNames.map((name) => (
                              <ListBox.Item key={name} id={name} textValue={name}>
                                {name}
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    )}
                  </div>

                  {addError && <p className="text-danger text-sm">{addError}</p>}
                </Modal.Body>
                <Modal.Footer>
                  <Button type="button" variant="ghost" onPress={closeModal}>
                    {t("common.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isDisabled={
                      submitting ||
                      !form.title.trim() ||
                      !form.max_score ||
                      !form.period_name ||
                      uniquePeriodNames.length === 0
                    }
                  >
                    {submitting ? <Spinner size="sm" /> : t("assignments.addModal.addButton")}
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
