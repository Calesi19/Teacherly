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
type ColorTheme = "default" | "ocean" | "forest" | "sunset" | "rose";

interface SettingsPageProps {
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  colorTheme: ColorTheme;
  onColorThemeChange: (colorTheme: ColorTheme) => void;
  onGoToTermsOfService: () => void;
  onGoToPrivacyPolicy: () => void;
  group?: Group | null;
  onGoToSchedule?: () => void;
  onGoToGroups?: () => void;
}

const COLOR_THEMES: { id: ColorTheme; label: string; swatch: string }[] = [
  { id: "default", label: "Default", swatch: "oklch(0.60 0.15 260)" },
  { id: "ocean", label: "Ocean", swatch: "oklch(0.65 0.17 195)" },
  { id: "forest", label: "Forest", swatch: "oklch(0.65 0.17 145)" },
  { id: "sunset", label: "Sunset", swatch: "oklch(0.72 0.18 55)" },
  { id: "rose", label: "Rose", swatch: "oklch(0.65 0.22 0)" },
];

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
  colorTheme,
  onColorThemeChange,
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

            <SettingsCard className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{t("settings.colorTheme")}</span>
                <span className="text-xs text-foreground/50">
                  {t("settings.colorThemeDescription")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {COLOR_THEMES.map((themeOption) => (
                  <button
                    key={themeOption.id}
                    onClick={() => onColorThemeChange(themeOption.id)}
                    aria-label={themeOption.label}
                    title={themeOption.label}
                    className="h-7 w-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
                    style={{
                      backgroundColor: themeOption.swatch,
                      boxShadow:
                        colorTheme === themeOption.id
                          ? `0 0 0 2px var(--background), 0 0 0 4px ${themeOption.swatch}`
                          : undefined,
                    }}
                  />
                ))}
              </div>
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
