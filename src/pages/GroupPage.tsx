import { Breadcrumb } from "../components/Breadcrumb";
import { useTranslation } from "../i18n/LanguageContext";
import type { Group } from "../types/group";

interface GroupPageProps {
  group: Group;
  onGoToGroups: () => void;
}

export function GroupPage({ group, onGoToGroups }: GroupPageProps) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col px-6 pt-8 pb-6 pl-3">
      <Breadcrumb
        items={[
          { label: t("groups.breadcrumb"), onClick: onGoToGroups },
          { label: group.name },
          { label: t("sidebar.group") },
        ]}
      />

      <div className="mb-6">
        <h2 className="text-2xl font-bold">{t("sidebar.group")}</h2>
      </div>

      <div className="flex-1" />
    </div>
  );
}
