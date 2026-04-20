import { useState } from "react";
import {
  Button,
  Modal,
  Label,
  Input,
  Spinner,
  useOverlayState,
} from "@heroui/react";
import type { NewClassroomInput } from "../types/classroom";

interface AddClassroomModalProps {
  onAdd: (input: NewClassroomInput) => Promise<void>;
}

const emptyForm: NewClassroomInput = { name: "", subject: "", grade: "" };

export function AddClassroomModal({ onAdd }: AddClassroomModalProps) {
  const state = useOverlayState();
  const [form, setForm] = useState<NewClassroomInput>(emptyForm);
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
        + Add Classroom
      </Button>

      <Modal state={state}>
        <Modal.Backdrop isDismissable={!submitting}>
          <Modal.Container>
            <Modal.Dialog>
              <form onSubmit={handleSubmit}>
                <Modal.Header>New Classroom</Modal.Header>
                <Modal.Body className="flex flex-col gap-4 pb-px overflow-visible">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="add-classroom-name">Name *</Label>
                    <Input
                      id="add-classroom-name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Room 101"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="add-classroom-subject">Subject</Label>
                    <Input
                      id="add-classroom-subject"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder="e.g. Mathematics"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="add-classroom-grade">Grade</Label>
                    <Input
                      id="add-classroom-grade"
                      value={form.grade}
                      onChange={(e) => setForm({ ...form, grade: e.target.value })}
                      placeholder="e.g. 10th"
                    />
                  </div>
                  {error && (
                    <p className="text-danger text-sm">{error}</p>
                  )}
                </Modal.Body>
                <Modal.Footer>
                  <Button type="button" variant="ghost" onPress={close}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" isDisabled={submitting}>
                    {submitting ? <Spinner size="sm" /> : "Add"}
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
