import { useState, useEffect } from "react";
import {
  Button,
  Input,
  Label,
  Select,
  ListBox,
  Spinner,
  DatePicker,
  DateField,
  Calendar,
} from "@heroui/react";
import { parseDate } from "@internationalized/date";
import type { DateValue } from "@internationalized/date";
import { useStudentInfo } from "../hooks/useStudentInfo";
import { Breadcrumb } from "../components/Breadcrumb";
import { useTranslation } from "../i18n/LanguageContext";
import type { Group } from "../types/group";
import type { Student } from "../types/student";

interface StudentInfoPageProps {
  student: Student;
  group: Group;
  onGoToGroups: () => void;
  onGoToStudents: () => void;
  onGoToStudentProfile: () => void;
}

function AppDatePicker({
  label,
  value,
  onChange,
  id,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  id: string;
}) {
  const parsed = value ? parseDate(value) : null;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <DatePicker
        className="w-full"
        aria-label={label}
        value={parsed}
        onChange={(date: DateValue | null) =>
          onChange(date ? date.toString() : "")
        }
      >
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
    </div>
  );
}

export function StudentInfoPage({
  student,
  group,
  onGoToGroups,
  onGoToStudents,
  onGoToStudentProfile,
}: StudentInfoPageProps) {
  const { t } = useTranslation();
  const { student: fresh, loading, error, save } = useStudentInfo(student.id);

  const [name, setName] = useState(student.name);
  const [gender, setGender] = useState(student.gender ?? "");
  const [birthdate, setBirthdate] = useState(student.birthdate ?? "");
  const [studentNumber, setStudentNumber] = useState(
    student.student_number ?? "",
  );
  const [enrollmentDate, setEnrollmentDate] = useState(
    student.enrollment_date ?? "",
  );
  const [enrollmentEndDate, setEnrollmentEndDate] = useState(
    student.enrollment_end_date ?? group.end_date ?? "",
  );

  useEffect(() => {
    if (fresh) {
      setName(fresh.name);
      setGender(fresh.gender ?? "");
      setBirthdate(fresh.birthdate ?? "");
      setStudentNumber(fresh.student_number ?? "");
      setEnrollmentDate(fresh.enrollment_date ?? "");
      setEnrollmentEndDate(fresh.enrollment_end_date ?? group.end_date ?? "");
    }
  }, [fresh, group.end_date]);

  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    setSaveError(null);
    try {
      await save({
        name: name.trim(),
        gender,
        birthdate,
        student_number: studentNumber,
        enrollment_date: enrollmentDate,
        enrollment_end_date: enrollmentEndDate,
      });
      onGoToStudentProfile();
    } catch (e) {
      setSaveError(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col px-6 pt-6 pb-6 pl-3">
      <Breadcrumb
        items={[
          { label: t("groups.breadcrumb"), onClick: onGoToGroups },
          { label: group.name },
          { label: t("students.breadcrumb"), onClick: onGoToStudents },
          { label: student.name, onClick: onGoToStudentProfile },
          { label: t("studentInfoPage.breadcrumb") },
        ]}
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{t("studentInfoPage.title")}</h2>
          <p className="text-sm text-muted">{student.name}</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onPress={handleSave}
          isDisabled={submitting || !name.trim()}
        >
          {submitting ? <Spinner size="sm" /> : t("common.save")}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner size="lg" color="accent" />
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-lg bg-danger/10 text-danger px-4 py-3 text-sm"
        >
          {error}
        </div>
      ) : (
        <div className="flex flex-col gap-5 max-w-lg pb-10">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="info-name">{t("studentInfoPage.nameLabel")}</Label>
            <Input
              id="info-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("studentInfoPage.namePlaceholder")}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="info-student-number">
              {t("studentInfoPage.studentIdLabel")}
            </Label>
            <Input
              id="info-student-number"
              value={studentNumber}
              onChange={(e) => setStudentNumber(e.target.value)}
              placeholder={t("studentInfoPage.studentIdPlaceholder")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t("studentInfoPage.genderLabel")}</Label>
            <Select
              aria-label={t("studentInfoPage.genderLabel")}
              selectedKey={gender || null}
              onSelectionChange={(key) => setGender(String(key ?? ""))}
            >
              <Select.Trigger>
                <Select.Value>
                  {({ selectedText, isPlaceholder }) =>
                    isPlaceholder
                      ? t("studentInfoPage.selectGender")
                      : selectedText
                  }
                </Select.Value>
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="Male" textValue={t("studentInfoPage.male")}>
                    {t("studentInfoPage.male")}
                  </ListBox.Item>
                  <ListBox.Item
                    id="Female"
                    textValue={t("studentInfoPage.female")}
                  >
                    {t("studentInfoPage.female")}
                  </ListBox.Item>
                  <ListBox.Item
                    id="Other"
                    textValue={t("studentInfoPage.other")}
                  >
                    {t("studentInfoPage.other")}
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          <AppDatePicker
            id="info-birthdate"
            label={t("studentInfoPage.birthdateLabel")}
            value={birthdate}
            onChange={setBirthdate}
          />

          <AppDatePicker
            id="info-enrollment-date"
            label={t("studentInfoPage.enrollmentDateLabel")}
            value={enrollmentDate}
            onChange={setEnrollmentDate}
          />

          <div className="flex flex-col gap-1.5">
            <AppDatePicker
              id="info-enrollment-end-date"
              label={t("studentInfoPage.enrollmentEndDateLabel")}
              value={enrollmentEndDate}
              onChange={setEnrollmentEndDate}
            />
            {group.end_date && (
              <p className="text-xs text-muted">
                {t("studentInfoPage.groupEnds", {
                  date: new Date(
                    group.end_date + "T12:00:00",
                  ).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }),
                })}
              </p>
            )}
          </div>

          {saveError && <p className="text-danger text-sm">{saveError}</p>}
        </div>
      )}
    </div>
  );
}
