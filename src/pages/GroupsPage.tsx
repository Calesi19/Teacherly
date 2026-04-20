import { Spinner } from "@heroui/react";
import { useGroups } from "../hooks/useGroups";
import { GroupCard } from "../components/GroupCard";
import { AddGroupModal } from "../components/AddGroupModal";
import { Breadcrumb } from "../components/Breadcrumb";
import { useTranslation } from "../i18n/LanguageContext";
import type { Group } from "../types/group";

interface GroupsPageProps {
  onSelectGroup: (group: Group) => void;
  currentGroup: Group | null;
}

export function GroupsPage({ onSelectGroup, currentGroup }: GroupsPageProps) {
  const { groups, loading, error, addGroup } = useGroups();
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <Breadcrumb items={[{ label: t("groups.breadcrumb") }]} />

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t("groups.title")}</h2>
        <AddGroupModal onAdd={addGroup} />
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" color="accent" />
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-lg bg-danger/10 text-danger px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && groups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg font-semibold text-muted">{t("groups.noGroupsYet")}</p>
          <p className="text-sm text-foreground/40 mt-1">{t("groups.noGroupsHint")}</p>
        </div>
      )}

      {!loading && groups.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((c) => (
            <GroupCard key={c.id} group={c} isSelected={currentGroup?.id === c.id} onClick={() => onSelectGroup(c)} />
          ))}
        </div>
      )}
    </div>
  );
}
