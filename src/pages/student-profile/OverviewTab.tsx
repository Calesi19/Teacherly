import { Ambulance, ShieldUser, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TabsContent } from "@/components/ui/tabs";
import { useTranslation } from "../../i18n/LanguageContext";
import type { Group } from "../../types/group";
import type { Contact } from "../../types/contact";
import type { Address } from "../../types/address";
import type { Student } from "../../types/student";
import type { StudentServices } from "../../types/studentServices";
import type { StudentAccommodations } from "../../types/studentAccommodations";
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

interface OverviewTabProps {
  student: Student;
  group: Group;
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
