import { Breadcrumb } from "../components/Breadcrumb";
import { GroupSettingsSection } from "../components/GroupSettingsSection";
import { useTranslation } from "../i18n/LanguageContext";
import type { Group } from "../types/group";

interface EditGroupPageProps {
  group: Group;
  onGoToGroups: () => void;
  onGoToGroup: () => void;
  onGoToSchedule: () => void;
}

export function EditGroupPage({
  group,
  onGoToGroups,
  onGoToGroup,
  onGoToSchedule,
}: EditGroupPageProps) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col overflow-y-auto px-6 pt-8 pb-6 pl-3">
      <Breadcrumb
        items={[
          { label: t("groups.breadcrumb"), onClick: onGoToGroups },
          { label: group.name, onClick: onGoToGroup },
          { label: t("groups.editGroup.breadcrumb") },
        ]}
      />

      <div className="mb-6">
        <h2 className="text-2xl font-bold">{t("groups.editGroup.title")}</h2>
      </div>

      <GroupSettingsSection
        group={group}
        onGoToSchedule={onGoToSchedule}
        onGoToGroups={onGoToGroups}
        onSaved={onGoToGroup}
      />
    </div>
  );
}
