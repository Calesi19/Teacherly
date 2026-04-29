import {
  Sun,
  Moon,
  Monitor,
  ChevronRight,
  FileText,
  Shield,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GroupSettingsSection } from "../components/GroupSettingsSection";
import { useTranslation } from "../i18n/LanguageContext";
import type { LanguagePreference } from "../i18n/LanguageContext";
import type { Group } from "../types/group";

type ThemePreference = "light" | "dark" | "system";

interface SettingsPageProps {
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  onGoToTermsOfService: () => void;
  onGoToPrivacyPolicy: () => void;
  group?: Group | null;
  onGoToSchedule?: () => void;
  onGoToGroups?: () => void;
}

function SettingsCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border bg-background px-4 py-3 ${className}`}>
      {children}
    </div>
  );
}

export function SettingsPage({
  theme,
  onThemeChange,
  onGoToTermsOfService,
  onGoToPrivacyPolicy,
  group,
  onGoToSchedule,
  onGoToGroups,
}: SettingsPageProps) {
  const { t, languagePreference, setLanguage } = useTranslation();

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">{t("settings.title")}</h2>
        <p className="mt-0.5 text-sm text-muted">{t("settings.description")}</p>
      </div>

      <div className="flex flex-col gap-6">
        {group && onGoToSchedule && onGoToGroups && (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
              {t("settings.sectionGroup")}
            </p>
            <GroupSettingsSection
              group={group}
              onGoToSchedule={onGoToSchedule}
              onGoToGroups={onGoToGroups}
            />
          </div>
        )}

        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
            {t("settings.sectionPresentation")}
          </p>
          <div className="flex flex-col gap-2">
            <SettingsCard className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{t("settings.appearance")}</span>
                <span className="text-xs text-foreground/50">
                  {t("settings.appearanceDescription")}
                </span>
              </div>
              <Select
                value={theme}
                onValueChange={(value) =>
                  onThemeChange((value ?? "system") as ThemePreference)
                }
              >
                <SelectTrigger className="w-36 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <span className="flex items-center gap-2">
                      <Sun size={14} />
                      {t("settings.light")}
                    </span>
                  </SelectItem>
                  <SelectItem value="dark">
                    <span className="flex items-center gap-2">
                      <Moon size={14} />
                      {t("settings.dark")}
                    </span>
                  </SelectItem>
                  <SelectItem value="system">
                    <span className="flex items-center gap-2">
                      <Monitor size={14} />
                      {t("settings.system")}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </SettingsCard>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
            {t("settings.sectionGeneral")}
          </p>
          <div className="flex flex-col gap-2">
            <SettingsCard className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{t("settings.language")}</span>
                <span className="text-xs text-foreground/50">
                  {t("settings.languageDescription")}
                </span>
              </div>
              <Select
                value={languagePreference}
                onValueChange={(value) =>
                  setLanguage((value ?? "system") as LanguagePreference)
                }
              >
                <SelectTrigger className="w-36 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">
                    <span className="flex items-center gap-2">
                      <Monitor size={14} />
                      {t("settings.languageSystem")}
                    </span>
                  </SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </SettingsCard>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
            {t("settings.sectionLegal")}
          </p>
          <div className="flex flex-col gap-2">
            <button type="button" onClick={onGoToTermsOfService} className="w-full text-left">
              <SettingsCard className="transition-colors hover:bg-muted/40">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                      <FileText size={16} />
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-medium">{t("settings.termsOfService")}</span>
                      <span className="text-xs text-foreground/50">
                        {t("settings.termsOfServiceDescription")}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-foreground/40" />
                </div>
              </SettingsCard>
            </button>

            <button type="button" onClick={onGoToPrivacyPolicy} className="w-full text-left">
              <SettingsCard className="transition-colors hover:bg-muted/40">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                      <Shield size={16} />
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-medium">{t("settings.privacyPolicy")}</span>
                      <span className="text-xs text-foreground/50">
                        {t("settings.privacyPolicyDescription")}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-foreground/40" />
                </div>
              </SettingsCard>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
