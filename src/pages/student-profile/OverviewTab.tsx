import { useMemo, useState } from "react";
import { Ambulance, ShieldUser, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useTranslation } from "../../i18n/LanguageContext";
import type { Group } from "../../types/group";
import type { Contact } from "../../types/contact";
import type { Address } from "../../types/address";
import type { Student } from "../../types/student";
import type { StudentServices } from "../../types/studentServices";
import type { StudentAccommodations } from "../../types/studentAccommodations";
import type { StudentAssignmentPreview } from "../../types/assignment";
import type { StudentAttendanceSummary } from "../../hooks/useStudentAttendance";
import {
  CopyButton,
  IconTooltip,
  InfoField,
  LoadingSpinner,
  SectionCard,
  SectionHeader,
} from "./shared";
import { formatDateFromLocal, formatShortDate, getAge } from "./utils";

interface ObservationGroup {
  label: string;
  items: string[];
}

function getGradeColorClass(percentage: number) {
  if (percentage >= 90) {
    return "border-success/30 bg-success/10 text-success";
  }
  if (percentage >= 80) {
    return "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-300";
  }
  if (percentage >= 70) {
    return "border-warning/35 bg-warning/10 text-warning";
  }
  if (percentage >= 60) {
    return "border-orange-500/35 bg-orange-500/10 text-orange-600 dark:text-orange-300";
  }
  return "border-danger/35 bg-danger/10 text-danger";
}

const ATTENDANCE_CHART_COLORS = {
  present: "var(--success)",
  absent: "var(--danger)",
  late: "var(--warning)",
  partial: "var(--accent)",
} as const;

type AttendanceChartKey = keyof typeof ATTENDANCE_CHART_COLORS;

interface OverviewTabProps {
  student: Student;
  group: Group;
  assignments: StudentAssignmentPreview[];
  loadingAssignments: boolean;
  attendanceSummary: StudentAttendanceSummary;
  loadingAttendance: boolean;
  contacts: Contact[];
  loadingContacts: boolean;
  addresses: Address[];
  loadingAddresses: boolean;
  services?: StudentServices | null;
  loadingServices: boolean;
  accommodations?: StudentAccommodations | null;
  loadingAccommodations: boolean;
  observationGroups: ObservationGroup[];
  loadingObservations: boolean;
  therapyLabels: string[];
  hasHealthContent: boolean;
  hasAccommodationContent: boolean;
  onGoToStudentInfo: () => void;
  onGoToContacts: () => void;
  onGoToAddresses: () => void;
  onGoToServices: () => void;
  onGoToAccommodations: () => void;
  onGoToObservations: () => void;
}

export function OverviewTab({
  student,
  group,
  assignments,
  loadingAssignments,
  attendanceSummary,
  loadingAttendance,
  contacts,
  loadingContacts,
  addresses,
  loadingAddresses,
  services,
  loadingServices,
  accommodations,
  loadingAccommodations,
  observationGroups,
  loadingObservations,
  therapyLabels,
  hasHealthContent,
  hasAccommodationContent,
  onGoToStudentInfo,
  onGoToContacts,
  onGoToAddresses,
  onGoToServices,
  onGoToAccommodations,
  onGoToObservations,
}: OverviewTabProps) {
  const { t } = useTranslation();
  const attendanceChartData = useMemo(() => {
    const presentOnly = Math.max(
      attendanceSummary.totalDays -
        attendanceSummary.absent -
        attendanceSummary.late -
        attendanceSummary.partial,
      0,
    );

    return [
      {
        key: "present",
        value: presentOnly,
        color: ATTENDANCE_CHART_COLORS.present,
      },
      {
        key: "absent",
        value: attendanceSummary.absent,
        color: ATTENDANCE_CHART_COLORS.absent,
      },
      {
        key: "late",
        value: attendanceSummary.late,
        color: ATTENDANCE_CHART_COLORS.late,
      },
      {
        key: "partial",
        value: attendanceSummary.partial,
        color: ATTENDANCE_CHART_COLORS.partial,
      },
    ] satisfies { key: AttendanceChartKey; value: number; color: string }[];
  }, [attendanceSummary]);
  const [hoveredAttendanceKey, setHoveredAttendanceKey] =
    useState<AttendanceChartKey | null>(null);
  const hoveredAttendance = hoveredAttendanceKey
    ? attendanceChartData.find((item) => item.key === hoveredAttendanceKey)
    : null;
  const renderedAttendanceSegments = hoveredAttendanceKey
    ? [
        ...attendanceChartData.filter(
          (item) => item.key !== hoveredAttendanceKey,
        ),
        ...attendanceChartData.filter(
          (item) => item.key === hoveredAttendanceKey,
        ),
      ]
    : attendanceChartData;
  const circumference = 2 * Math.PI * 44;

  const gradedAssignments = assignments.filter(
    (assignment) => assignment.score !== null,
  );
  const gradeTotals = gradedAssignments.reduce(
    (totals, assignment) => ({
      score: totals.score + (assignment.score ?? 0),
      maxScore: totals.maxScore + assignment.max_score,
    }),
    { score: 0, maxScore: 0 },
  );
  const gradePercentage =
    gradeTotals.maxScore > 0
      ? Math.round((gradeTotals.score / gradeTotals.maxScore) * 100)
      : null;
  const gradesByClass = Array.from(
    gradedAssignments
      .reduce((map, assignment) => {
        const current = map.get(assignment.period_name) ?? {
          periodName: assignment.period_name,
          score: 0,
          maxScore: 0,
          count: 0,
        };

        current.score += assignment.score ?? 0;
        current.maxScore += assignment.max_score;
        current.count += 1;
        map.set(assignment.period_name, current);
        return map;
      }, new Map<string, { periodName: string; score: number; maxScore: number; count: number }>())
      .values(),
  ).sort((a, b) => a.periodName.localeCompare(b.periodName));

  return (
    <TabsContent value="overview" className="flex-1 overflow-y-auto pt-4">
      <div className="flex flex-col gap-4">
        <SectionCard>
          <SectionHeader
            title={t("studentProfile.overview.studentInfo")}
            onEdit={onGoToStudentInfo}
            ariaLabel="Edit student info"
            editLabel={t("common.edit")}
          />
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <InfoField
              label={t("studentProfile.overview.studentId")}
              value={
                student.student_number ? (
                  <span className="inline-flex items-center leading-none">
                    {student.student_number}
                    <CopyButton value={student.student_number} />
                  </span>
                ) : null
              }
            />
            <InfoField
              label={t("studentProfile.overview.gender")}
              value={student.gender}
            />
            <InfoField
              label={t("studentProfile.overview.birthdate")}
              value={student.birthdate ? formatShortDate(student.birthdate) : null}
            />
            <InfoField
              label={t("studentProfile.overview.age")}
              value={
                student.birthdate
                  ? t("studentProfile.overview.ageYears", {
                      age: getAge(student.birthdate),
                    })
                  : null
              }
            />
            <InfoField
              label={t("studentProfile.overview.enrollmentDate")}
              value={student.enrollment_date ? formatShortDate(student.enrollment_date) : null}
            />
            <InfoField
              label={t("studentProfile.overview.enrollmentEndDate")}
              value={
                student.enrollment_end_date ? (
                  formatDateFromLocal(student.enrollment_end_date)
                ) : group.end_date ? (
                  <span className="text-foreground/40">
                    {formatDateFromLocal(group.end_date)}{" "}
                    <span className="text-xs">
                      {t("studentProfile.overview.groupDefault")}
                    </span>
                  </span>
                ) : null
              }
            />
          </div>
        </SectionCard>

        <SectionCard className="flex flex-col gap-4">
          <div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t("studentProfile.overview.attendanceSummary")}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("studentProfile.attendance.summary.totalDays")}:{" "}
                {attendanceSummary.totalDays}
              </p>
            </div>
          </div>

          {loadingAttendance ? (
            <LoadingSpinner />
          ) : attendanceSummary.totalDays === 0 ? (
            <p className="text-sm text-foreground/40">
              {t("studentProfile.attendance.noAttendance")}
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,220px)_1fr] lg:items-center">
              <div className="relative mx-auto aspect-square w-full max-w-[220px]">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                  <circle
                    cx="60"
                    cy="60"
                    r="44"
                    fill="none"
                    stroke="var(--border)"
                    strokeWidth="10"
                  />
                  {renderedAttendanceSegments.map((item) => {
                    const originalOffset =
                      attendanceChartData
                        .slice(
                          0,
                          attendanceChartData.findIndex(
                            (segment) => segment.key === item.key,
                          ),
                        )
                        .reduce(
                          (offset, segment) =>
                            offset +
                            (segment.value / attendanceSummary.totalDays) *
                              circumference,
                          0,
                        );
                    const fraction = item.value / attendanceSummary.totalDays;
                    const dashLength = fraction * circumference;
                    const segment = (
                      <circle
                        key={item.key}
                        cx="60"
                        cy="60"
                        r="44"
                        fill="none"
                        stroke={item.color}
                        strokeWidth={item.key === hoveredAttendanceKey ? 16 : 10}
                        strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                        strokeDashoffset={-originalOffset}
                        strokeLinecap="round"
                        className="cursor-pointer transition-[stroke-width,opacity] duration-150"
                        opacity={item.value === 0 ? 0.2 : 1}
                        onMouseEnter={() => setHoveredAttendanceKey(item.key)}
                        onMouseLeave={() => setHoveredAttendanceKey(null)}
                        tabIndex={0}
                        onFocus={() => setHoveredAttendanceKey(item.key)}
                        onBlur={() => setHoveredAttendanceKey(null)}
                      />
                    );
                    return segment;
                  })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-bold text-foreground">
                    {hoveredAttendance?.value ?? attendanceSummary.totalDays}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {hoveredAttendance
                      ? t(`studentProfile.attendance.summary.${hoveredAttendance.key}`)
                      : t("studentProfile.attendance.summary.totalDays")}
                  </span>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {attendanceChartData.map((item) => {
                  const isActive = item.key === hoveredAttendanceKey;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onMouseEnter={() => setHoveredAttendanceKey(item.key)}
                      onMouseLeave={() => setHoveredAttendanceKey(null)}
                      onFocus={() => setHoveredAttendanceKey(item.key)}
                      onBlur={() => setHoveredAttendanceKey(null)}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                        isActive
                          ? "border-foreground/20 bg-muted/55"
                          : "border-border/60 hover:bg-muted/30",
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate text-sm font-medium text-foreground">
                          {t(`studentProfile.attendance.summary.${item.key}`)}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-foreground">
                        {item.value}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard className="flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("studentProfile.overview.gradeSummary")}
            </h3>
          </div>
          {loadingAssignments ? (
            <LoadingSpinner />
          ) : gradedAssignments.length === 0 ? (
            <p className="text-sm text-foreground/40">
              {t("studentProfile.overview.noGrades")}
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              <div
                className={cn(
                  "flex flex-wrap items-end justify-between gap-3 rounded-lg border px-4 py-3",
                  getGradeColorClass(gradePercentage ?? 0),
                )}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold uppercase tracking-wide opacity-75">
                    {t("studentProfile.overview.overallGrade")}
                  </span>
                  <span className="text-2xl font-bold">
                    {gradePercentage}%
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">
                    {gradeTotals.score}/{gradeTotals.maxScore}
                  </div>
                  <div className="text-xs opacity-75">
                    {t("studentProfile.overview.gradedAssignments", {
                      count: gradedAssignments.length,
                    })}
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {gradesByClass.map((classGrade) => {
                  const percentage = Math.round(
                    (classGrade.score / classGrade.maxScore) * 100,
                  );

                  return (
                    <div
                      key={classGrade.periodName}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-lg border px-3 py-2",
                        getGradeColorClass(percentage),
                      )}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {classGrade.periodName}
                        </div>
                        <div className="text-xs opacity-75">
                          {classGrade.score}/{classGrade.maxScore}
                        </div>
                      </div>
                      <span className="shrink-0 text-sm font-semibold">
                        {percentage}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </SectionCard>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SectionCard className="flex flex-col gap-3">
            <SectionHeader
              title={t("studentProfile.overview.contacts")}
              onEdit={onGoToContacts}
              ariaLabel="Edit contacts"
              editLabel={t("common.edit")}
            />
            {loadingContacts ? (
              <LoadingSpinner />
            ) : contacts.length === 0 ? (
              <p className="text-sm text-foreground/40">
                {t("studentProfile.overview.noContacts")}
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {contacts.slice(0, 3).map((contact) => (
                  <div
                    key={contact.id}
                    className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium">{contact.name}</span>
                      {contact.is_primary_guardian && (
                        <IconTooltip
                          label={t("studentProfile.overview.primaryGuardian")}
                          className="bg-accent/10 text-accent"
                        >
                          <ShieldUser size={10} />
                        </IconTooltip>
                      )}
                      {contact.is_emergency_contact && (
                        <IconTooltip
                          label={t("studentProfile.overview.emergencyContact")}
                          className="bg-warning/10 text-warning"
                        >
                          <Ambulance size={10} />
                        </IconTooltip>
                      )}
                    </div>
                    {contact.relationship ? (
                      <span className="text-xs text-muted-foreground">{contact.relationship}</span>
                    ) : null}
                    {contact.phone ? (
                      <span className="inline-flex items-center text-xs text-foreground/60">
                        {contact.phone}
                        <CopyButton value={contact.phone} />
                      </span>
                    ) : null}
                    {contact.email ? (
                      <span className="inline-flex items-center text-xs text-foreground/60">
                        {contact.email}
                        <CopyButton value={contact.email} />
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard className="flex flex-col gap-3">
            <SectionHeader
              title={t("studentProfile.overview.addresses")}
              onEdit={onGoToAddresses}
              ariaLabel="Edit addresses"
              editLabel={t("common.edit")}
            />
            {loadingAddresses ? (
              <LoadingSpinner />
            ) : addresses.length === 0 ? (
              <p className="text-sm text-foreground/40">
                {t("studentProfile.overview.noAddresses")}
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {addresses.slice(0, 3).map((address) => (
                  <div
                    key={address.id}
                    className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-1.5">
                      {address.label ? (
                        <span className="text-sm font-medium">{address.label}</span>
                      ) : null}
                      {address.is_student_home && (
                        <IconTooltip
                          label={t("addresses.studentLivesHere")}
                          className="bg-success/10 text-success"
                        >
                          <Star size={10} fill="currentColor" />
                        </IconTooltip>
                      )}
                    </div>
                    <span className="text-xs text-foreground/60">{address.street}</span>
                    {address.city || address.state || address.zip_code ? (
                      <span className="text-xs text-foreground/60">
                        {[address.city, address.state, address.zip_code]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    ) : null}
                    {address.country ? (
                      <span className="text-xs text-muted-foreground">{address.country}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <SectionCard className="flex flex-col gap-3">
          <SectionHeader
            title={t("studentProfile.overview.health")}
            onEdit={onGoToServices}
            ariaLabel="Edit health"
            editLabel={t("common.edit")}
          />
          {loadingServices ? (
            <LoadingSpinner />
          ) : !hasHealthContent ? (
            <p className="text-sm text-foreground/40">
              {t("studentProfile.overview.noHealth")}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {services?.has_special_education ? (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("studentProfile.health.specialEducation")}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {t("studentProfile.health.yes")}
                  </span>
                </div>
              ) : null}
              {therapyLabels.length > 0 ? (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("studentProfile.health.attendsTherapy")}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {therapyLabels.map((label) => (
                      <Badge key={label} variant="secondary">
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
              {services && services.medical_plan !== "none" ? (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("studentProfile.health.medicalInsurance")}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {services.medical_plan === "private"
                      ? t("servicesPage.medicalPrivate")
                      : t("servicesPage.medicalGovernment")}
                  </span>
                </div>
              ) : null}
              {services?.has_treatment ? (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("studentProfile.health.medicalTreatment")}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {t("studentProfile.health.active")}
                  </span>
                </div>
              ) : null}
              {services?.allergies ? (
                <div className="flex flex-col gap-0.5 sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("studentProfile.health.allergies")}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {services.allergies}
                  </span>
                </div>
              ) : null}
              {services?.conditions ? (
                <div className="flex flex-col gap-0.5 sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("servicesPage.conditionsLabel")}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {services.conditions}
                  </span>
                </div>
              ) : null}
            </div>
          )}
        </SectionCard>

        <SectionCard className="flex flex-col gap-3">
          <SectionHeader
            title={t("studentProfile.overview.accommodations")}
            onEdit={onGoToAccommodations}
            ariaLabel="Edit accommodations"
            editLabel={t("common.edit")}
          />
          {loadingAccommodations ? (
            <LoadingSpinner />
          ) : !hasAccommodationContent ? (
            <p className="text-sm text-foreground/40">
              {t("studentProfile.overview.noAccommodations")}
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {accommodations?.desk_placement ? (
                <Badge variant="secondary">
                  {t("studentProfile.accommodations.deskPlacement")}
                </Badge>
              ) : null}
              {accommodations?.extended_time ? (
                <Badge variant="secondary">
                  {t("studentProfile.accommodations.extendedTime")}
                </Badge>
              ) : null}
              {accommodations?.shorter_assignments ? (
                <Badge variant="secondary">
                  {t("studentProfile.accommodations.shorterAssignments")}
                </Badge>
              ) : null}
              {accommodations?.use_abacus ? (
                <Badge variant="secondary">
                  {t("studentProfile.accommodations.abacus")}
                </Badge>
              ) : null}
              {accommodations?.simple_instructions ? (
                <Badge variant="secondary">
                  {t("studentProfile.accommodations.simpleInstructions")}
                </Badge>
              ) : null}
              {accommodations?.visual_examples ? (
                <Badge variant="secondary">
                  {t("studentProfile.accommodations.visualExamples")}
                </Badge>
              ) : null}
            </div>
          )}
        </SectionCard>

        <SectionCard className="flex flex-col gap-3">
          <SectionHeader
            title={t("studentProfile.overview.observations")}
            onEdit={onGoToObservations}
            ariaLabel="Edit observations"
            editLabel={t("common.edit")}
          />
          {loadingObservations ? (
            <LoadingSpinner />
          ) : observationGroups.length === 0 ? (
            <p className="text-sm text-foreground/40">
              {t("studentProfile.overview.noObservations")}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {observationGroups.map((groupItem) => (
                <div key={groupItem.label} className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {groupItem.label}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {groupItem.items.map((item) => (
                      <Badge key={item} variant="secondary">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </TabsContent>
  );
}
