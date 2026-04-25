import { Select, ListBox, Surface } from "@heroui/react";
import { Sun, Moon, Monitor, ChevronRight, FileText, Shield } from "lucide-react";
import { useTranslation } from "../i18n/LanguageContext";
import type { LanguagePreference } from "../i18n/LanguageContext";

type ThemePreference = "light" | "dark" | "system";
type ColorTheme = "default" | "ocean" | "forest" | "sunset" | "rose";

interface SettingsPageProps {
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  colorTheme: ColorTheme;
  onColorThemeChange: (colorTheme: ColorTheme) => void;
  onGoToTermsOfService: () => void;
  onGoToPrivacyPolicy: () => void;
}

const COLOR_THEMES: { id: ColorTheme; label: string; swatch: string }[] = [
  { id: "default", label: "Default", swatch: "oklch(0.6204 0.195 253.83)" },
  { id: "ocean",   label: "Ocean",   swatch: "oklch(0.65 0.17 195)" },
  { id: "forest",  label: "Forest",  swatch: "oklch(0.65 0.17 145)" },
  { id: "sunset",  label: "Sunset",  swatch: "oklch(0.72 0.18 55)" },
  { id: "rose",    label: "Rose",    swatch: "oklch(0.65 0.22 0)" },
];

export function SettingsPage({
  theme,
  onThemeChange,
  colorTheme,
  onColorThemeChange,
  onGoToTermsOfService,
  onGoToPrivacyPolicy,
}: SettingsPageProps) {
  const { t, languagePreference, setLanguage } = useTranslation();

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">{t("settings.title")}</h2>
        <p className="text-sm text-muted mt-0.5">{t("settings.description")}</p>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wide">{t("settings.sectionPresentation")}</p>
          <div className="flex flex-col gap-2">
            <Surface className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{t("settings.appearance")}</span>
                <span className="text-xs text-foreground/50">{t("settings.appearanceDescription")}</span>
              </div>
              <Select
                aria-label="Theme"
                selectedKey={theme}
                onSelectionChange={(key) => onThemeChange(String(key) as ThemePreference)}
                className="w-36 shrink-0"
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="light" textValue={t("settings.light")}><span className="flex items-center gap-2"><Sun size={14} />{t("settings.light")}</span></ListBox.Item>
                    <ListBox.Item id="dark" textValue={t("settings.dark")}><span className="flex items-center gap-2"><Moon size={14} />{t("settings.dark")}</span></ListBox.Item>
                    <ListBox.Item id="system" textValue={t("settings.system")}><span className="flex items-center gap-2"><Monitor size={14} />{t("settings.system")}</span></ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            </Surface>

            <Surface className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{t("settings.colorTheme")}</span>
                <span className="text-xs text-foreground/50">{t("settings.colorThemeDescription")}</span>
              </div>
              <div className="flex items-center gap-2">
                {COLOR_THEMES.map((ct) => (
                  <button
                    key={ct.id}
                    onClick={() => onColorThemeChange(ct.id)}
                    aria-label={ct.label}
                    title={ct.label}
                    className="w-7 h-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
                    style={{
                      backgroundColor: ct.swatch,
                      boxShadow: colorTheme === ct.id
                        ? `0 0 0 2px var(--background), 0 0 0 4px ${ct.swatch}`
                        : undefined,
                    }}
                  />
                ))}
              </div>
            </Surface>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wide">{t("settings.sectionGeneral")}</p>
          <div className="flex flex-col gap-2">
            <Surface className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{t("settings.language")}</span>
                <span className="text-xs text-foreground/50">{t("settings.languageDescription")}</span>
              </div>
              <Select
                aria-label="Language"
                selectedKey={languagePreference}
                onSelectionChange={(key) => setLanguage(String(key) as LanguagePreference)}
                className="w-36 shrink-0"
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="system" textValue={t("settings.languageSystem")}><span className="flex items-center gap-2"><Monitor size={14} />{t("settings.languageSystem")}</span></ListBox.Item>
                    <ListBox.Item id="en" textValue="English">English</ListBox.Item>
                    <ListBox.Item id="es" textValue="Español">Español</ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            </Surface>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wide">{t("settings.sectionLegal")}</p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onGoToTermsOfService}
              className="w-full text-left"
            >
              <Surface className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg transition-colors hover:bg-surface-secondary/60">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <FileText size={16} />
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-medium">{t("settings.termsOfService")}</span>
                    <span className="text-xs text-foreground/50">{t("settings.termsOfServiceDescription")}</span>
                  </div>
                </div>
                <ChevronRight size={16} className="shrink-0 text-foreground/40" />
              </Surface>
            </button>

            <button
              type="button"
              onClick={onGoToPrivacyPolicy}
              className="w-full text-left"
            >
              <Surface className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg transition-colors hover:bg-surface-secondary/60">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <Shield size={16} />
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-medium">{t("settings.privacyPolicy")}</span>
                    <span className="text-xs text-foreground/50">{t("settings.privacyPolicyDescription")}</span>
                  </div>
                </div>
                <ChevronRight size={16} className="shrink-0 text-foreground/40" />
              </Surface>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
