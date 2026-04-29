import { useState } from "react";
import {
  Button,
  Input,
  Label,
  Modal,
  Spinner,
  Chip,
  DatePicker,
  DateField,
  Calendar,
  useOverlayState,
} from "@heroui/react";
import { Trash2, CalendarDays } from "lucide-react";
import { parseDate } from "@internationalized/date";
import { useGroups } from "../hooks/useGroups";
import { Breadcrumb } from "../components/Breadcrumb";
import { useTranslation } from "../i18n/LanguageContext";
import type { Group } from "../types/group";

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

interface EditGroupPageProps {
  group: Group;
  onGoToGroups: () => void;
  onGoToDashboard: () => void;
  onGoToSchedule: () => void;
}

function CustomDatePicker({
  label,
  value,
  onChange,
  minValue,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  minValue?: string;
}) {
  return (
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
}

export function EditGroupPage({
  group,
  onGoToGroups,
  onGoToDashboard,
  onGoToSchedule,
}: EditGroupPageProps) {
  const { t } = useTranslation();
  const { updateGroup, deleteGroup } = useGroups();
  const deleteModalState = useOverlayState();

  const [name, setName] = useState(group.name);
  const [schoolName, setSchoolName] = useState(group.school_name ?? "");
  const [grade, setGrade] = useState(group.grade ?? "");
  const [startDate, setStartDate] = useState(group.start_date ?? "");
  const [endDate, setEndDate] = useState(group.end_date ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const CONFIRM_PHRASE = t("groups.editGroup.confirmPhrase");

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteGroup(group.id);
      deleteModalState.close();
      onGoToGroups();
    } catch (e) {
      setSaveError(String(e));
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    setSaveError(null);
    try {
      await updateGroup(group.id, {
        name: name.trim(),
        grade,
        school_name: schoolName,
        start_date: startDate,
        end_date: endDate,
      });
      onGoToDashboard();
    } catch (e) {
      setSaveError(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col px-6 py-6 pl-3">
      <Breadcrumb
        items={[
          { label: t("groups.breadcrumb"), onClick: onGoToGroups },
          { label: group.name, onClick: onGoToDashboard },
          { label: t("groups.editGroup.breadcrumb") },
        ]}
      />

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t("groups.editGroup.title")}</h2>
        <Button
          variant="primary"
          size="sm"
          onPress={handleSave}
          isDisabled={submitting || !name.trim()}
        >
          {submitting ? <Spinner size="sm" /> : t("common.save")}
        </Button>
      </div>

      <div className="flex flex-col gap-5 max-w-lg pb-10">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-group-name">
            {t("groups.addGroupModal.nameLabel")}
          </Label>
          <Input
            id="edit-group-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("groups.addGroupModal.namePlaceholder")}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-group-school">
            {t("groups.addGroupModal.schoolNameLabel")}
          </Label>
          <Input
            id="edit-group-school"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder={t("groups.addGroupModal.schoolNamePlaceholder")}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>{t("groups.addGroupModal.gradeLabel")}</Label>
          <div className="flex flex-wrap gap-2">
            {GRADE_OPTIONS.map((option) => {
              const isSelected = grade === option;
              return (
                <Chip
                  key={option}
                  variant={isSelected ? "primary" : "soft"}
                  color={isSelected ? "accent" : "default"}
                  className="cursor-pointer transition-transform active:scale-95"
                  onClick={() => setGrade(isSelected ? "" : option)}
                >
                  {t(`groups.addGroupModal.grades.${option}`)}
                </Chip>
              );
            })}
          </div>
        </div>

        <CustomDatePicker
          label={t("groups.addGroupModal.startDateLabel")}
          value={startDate}
          onChange={setStartDate}
        />

        <CustomDatePicker
          label={t("groups.addGroupModal.endDateLabel")}
          value={endDate}
          minValue={startDate}
          onChange={setEndDate}
        />

        {saveError && <p className="text-danger text-sm">{saveError}</p>}

        <hr className="border-border" />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">{t("sidebar.schedule")}</p>
            <p className="text-sm text-foreground/60 mt-0.5">
              Manage course periods for this group.
            </p>
          </div>
          <Button variant="ghost" size="sm" onPress={onGoToSchedule}>
            <CalendarDays size={16} />
            Manage
          </Button>
        </div>

        <hr className="border-border" />

        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-semibold text-danger">
              {t("groups.editGroup.dangerZoneTitle")}
            </p>
            <p className="text-sm text-foreground/60 mt-0.5">
              {t("groups.editGroup.dangerZoneDescription")}
            </p>
          </div>
          <Button
            variant="danger"
            onPress={deleteModalState.open}
            className="w-full"
          >
            <Trash2 size={16} />
            {t("groups.editGroup.deleteButton")}
          </Button>
        </div>
      </div>

      <Modal
        state={deleteModalState}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirmText("");
          }
        }}
      >
        <Modal.Backdrop isDismissable={!deleting}>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>{t("groups.editGroup.deleteTitle")}</Modal.Header>
              <Modal.Body className="flex flex-col gap-4 pb-px overflow-visible">
                <p className="text-sm text-foreground/70">
                  {t("groups.editGroup.deleteDescription")}
                </p>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="delete-confirm">
                    {t("groups.editGroup.deleteConfirmLabel", {
                      phrase: CONFIRM_PHRASE,
                    })}
                  </Label>
                  <Input
                    id="delete-confirm"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={CONFIRM_PHRASE}
                    disabled={deleting}
                  />
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  type="button"
                  variant="ghost"
                  isDisabled={deleting}
                  onPress={() => {
                    deleteModalState.close();
                    setDeleteConfirmText("");
                  }}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  isDisabled={deleting || deleteConfirmText !== CONFIRM_PHRASE}
                  onPress={handleDelete}
                >
                  {deleting ? <Spinner size="sm" /> : t("common.delete")}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
