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

const emptyForm: NewGroupInput = { name: "", subject: "", grade: "" };

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
                    <Label htmlFor="add-group-subject">{t("groups.addGroupModal.subjectLabel")}</Label>
                    <Input
                      id="add-group-subject"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder={t("groups.addGroupModal.subjectPlaceholder")}
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
