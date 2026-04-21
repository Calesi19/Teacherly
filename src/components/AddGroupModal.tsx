import { useState } from "react";
import {
  Button,
  Modal,
  Label,
  Input,
  Spinner,
  useOverlayState,
  Chip,
  DatePicker, // New
  DateField, // New
  Calendar, // New
} from "@heroui/react";
import { parseDate } from "@internationalized/date"; // Required for HeroUI Dates
import { useTranslation } from "../i18n/LanguageContext";
import type { NewGroupInput } from "../types/group";

interface AddGroupModalProps {
  onAdd: (input: NewGroupInput) => Promise<void>;
}

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
  start_date: "",
  end_date: "",
};

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

  // Reusable DatePicker structure to keep the JSX clean
  const CustomDatePicker = ({
    label,
    value,
    onChange,
    minValue,
  }: {
    label: string;
    value: string;
    onChange: (dateStr: string) => void;
    minValue?: string;
  }) => (
    <DatePicker
      className="w-full"
      value={value ? parseDate(value) : null}
      minValue={minValue ? parseDate(minValue) : undefined}
      onChange={(date) => onChange(date ? date.toString() : "")}
    >
      <Label>{label}</Label>
      <DateField.Group fullWidth>
        <DateField.Input>
          {(segment) => <DateField.Segment segment={segment} />}
        </DateField.Input>
        <DateField.Suffix>
          <DatePicker.Trigger>
            <DatePicker.TriggerIndicator />
          </DatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      <DatePicker.Popover>
        <Calendar aria-label={label}>
          <Calendar.Header>
            <Calendar.YearPickerTrigger>
              <Calendar.YearPickerTriggerHeading />
              <Calendar.YearPickerTriggerIndicator />
            </Calendar.YearPickerTrigger>
            <Calendar.NavButton slot="previous" />
            <Calendar.NavButton slot="next" />
          </Calendar.Header>
          <Calendar.Grid>
            <Calendar.GridHeader>
              {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
            </Calendar.GridHeader>
            <Calendar.GridBody>
              {(date) => <Calendar.Cell date={date} />}
            </Calendar.GridBody>
          </Calendar.Grid>
          <Calendar.YearPickerGrid>
            <Calendar.YearPickerGridBody>
              {({ year }) => <Calendar.YearPickerCell year={year} />}
            </Calendar.YearPickerGridBody>
          </Calendar.YearPickerGrid>
        </Calendar>
      </DatePicker.Popover>
    </DatePicker>
  );

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
                  {/* Group Name Input */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="add-group-name">
                      {t("groups.addGroupModal.nameLabel")}
                    </Label>
                    <Input
                      id="add-group-name"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder={t("groups.addGroupModal.namePlaceholder")}
                      required
                    />
                  </div>

                  {/* Grade Selection */}
                  <div className="flex flex-col gap-2">
                    <Label>{t("groups.addGroupModal.gradeLabel")}</Label>
                    <div className="flex flex-wrap gap-2">
                      {GRADE_OPTIONS.map((grade) => {
                        const isSelected = form.grade === grade;
                        return (
                          <Chip
                            key={grade}
                            variant={isSelected ? "primary" : "soft"}
                            color={isSelected ? "accent" : "default"}
                            className="cursor-pointer transition-transform active:scale-95"
                            onClick={() => handleGradeSelect(grade)}
                          >
                            {grade}
                          </Chip>
                        );
                      })}
                    </div>
                  </div>

                  {/* Start Date */}
                  <CustomDatePicker
                    label={t("groups.addGroupModal.startDateLabel")}
                    value={form.start_date}
                    onChange={(val) => setForm({ ...form, start_date: val })}
                  />

                  {/* End Date */}
                  <CustomDatePicker
                    label={t("groups.addGroupModal.endDateLabel")}
                    value={form.end_date}
                    minValue={form.start_date}
                    onChange={(val) => setForm({ ...form, end_date: val })}
                  />

                  {error && <p className="text-danger text-sm">{error}</p>}
                </Modal.Body>

                <Modal.Footer>
                  <Button type="button" variant="ghost" onPress={close}>
                    {t("common.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isDisabled={submitting}
                  >
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
