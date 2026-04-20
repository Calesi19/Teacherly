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
import type { NewGroupInput } from "../types/group";

interface AddGroupModalProps {
  onAdd: (input: NewGroupInput) => Promise<void>;
}

const emptyForm: NewGroupInput = { name: "", grade: "", start_date: "", end_date: "" };

export function AddGroupModal({ onAdd }: AddGroupModalProps) {
  const state = useOverlayState();
  const { t } = useTranslation();
  const [form, setForm] = useState<NewGroupInput>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setForm(emptyForm);
    setError(null);
    state.close();
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
      <Button variant="primary" onPress={state.open}>
        {t("groups.addGroup")}
      </Button>

      <Modal state={state}>
        <Modal.Backdrop isDismissable={!submitting}>
          <Modal.Container>
            <Modal.Dialog>
              <form onSubmit={handleSubmit}>
                <Modal.Header>{t("groups.addGroupModal.title")}</Modal.Header>
                <Modal.Body className="flex flex-col gap-4 pb-px overflow-visible">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="add-group-name">{t("groups.addGroupModal.nameLabel")}</Label>
                    <Input
                      id="add-group-name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder={t("groups.addGroupModal.namePlaceholder")}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="add-group-grade">{t("groups.addGroupModal.gradeLabel")}</Label>
                    <Input
                      id="add-group-grade"
                      value={form.grade}
                      onChange={(e) => setForm({ ...form, grade: e.target.value })}
                      placeholder={t("groups.addGroupModal.gradePlaceholder")}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="add-group-start-date">{t("groups.addGroupModal.startDateLabel")}</Label>
                    <input
                      id="add-group-start-date"
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                      className="w-full rounded-lg border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/50"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="add-group-end-date">{t("groups.addGroupModal.endDateLabel")}</Label>
                    <input
                      id="add-group-end-date"
                      type="date"
                      value={form.end_date}
                      min={form.start_date || undefined}
                      onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                      className="w-full rounded-lg border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/50"
                    />
                  </div>
                  {error && (
                    <p className="text-danger text-sm">{error}</p>
                  )}
                </Modal.Body>
                <Modal.Footer>
                  <Button type="button" variant="ghost" onPress={close}>
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" variant="primary" isDisabled={submitting}>
                    {submitting ? <Spinner size="sm" /> : t("common.add")}
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
