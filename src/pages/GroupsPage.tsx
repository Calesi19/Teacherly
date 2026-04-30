import { GroupCard } from "../components/GroupCard";
import { AddGroupModal } from "../components/AddGroupModal";
import { useTranslation } from "../i18n/LanguageContext";
import type { Group } from "../types/group";
import type { NewGroupInput } from "../types/group";

interface GroupsPageProps {
  onSelectGroup: (group: Group) => void;
  currentGroup: Group | null;
  groups: Group[];
  loading: boolean;
  error: string | null;
  onAddGroup: (input: NewGroupInput) => Promise<void>;
}

export function GroupsPage({
  onSelectGroup,
  currentGroup,
  groups,
  loading,
  error,
  onAddGroup,
}: GroupsPageProps) {
  const { t } = useTranslation();

  return (
    <div className="relative flex h-full flex-col overflow-y-auto px-6 pt-8 pb-6 pl-3">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t("groups.title")}</h2>
        <AddGroupModal onAdd={onAddGroup} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {!loading && !error && groups.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
            <p className="text-lg font-semibold text-muted">{t("groups.noGroupsYet")}</p>
            <p className="mt-1 text-sm text-foreground/40">{t("groups.noGroupsHint")}</p>
          </div>
        )}

        {!loading && groups.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((c) => (
              <GroupCard
                key={c.id}
                group={c}
                isSelected={currentGroup?.id === c.id}
                onClick={() => onSelectGroup(c)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
