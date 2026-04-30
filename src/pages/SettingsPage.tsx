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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "../i18n/LanguageContext";
import type { LanguagePreference } from "../i18n/LanguageContext";

type ThemePreference = "light" | "dark" | "system";
type ColorTheme =
  | "pastel"
  | "classic"
  | "warm"
  | "lavender"
  | "forest"
  | "sunset"
  | "confetti"
  | "seaside"
  | "storybook";
type FontSizePreference = "regular" | "large" | "extra-large";

interface SettingsPageProps {
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  colorTheme: ColorTheme;
  onColorThemeChange: (theme: ColorTheme) => void;
  fontSize: FontSizePreference;
  onFontSizeChange: (size: FontSizePreference) => void;
  onGoToTermsOfService: () => void;
  onGoToPrivacyPolicy: () => void;
}

function SettingsCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border bg-background px-4 py-3 ${className}`}>
      {children}
    </div>
  );
}

export function SettingsPage({
  theme,
  onThemeChange,
  colorTheme,
  onColorThemeChange,
  fontSize,
  onFontSizeChange,
  onGoToTermsOfService,
  onGoToPrivacyPolicy,
}: SettingsPageProps) {
  const { t, languagePreference, setLanguage } = useTranslation();

  return (
    <div className="flex h-full flex-col overflow-y-auto px-6 pt-8 pb-6 pl-3">
      <Tabs defaultValue="presentation" className="flex flex-1 flex-col">
        <div className="mb-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold">{t("settings.title")}</h2>
          </div>

          <TabsList
            variant="line"
            aria-label="Settings sections"
            className="flex-wrap"
          >
            <TabsTrigger value="presentation">
              {t("settings.sectionPresentation")}
            </TabsTrigger>
            <TabsTrigger value="general">
              {t("settings.sectionGeneral")}
            </TabsTrigger>
            <TabsTrigger value="legal">
              {t("settings.sectionLegal")}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="presentation" className="pt-4">
          <div className="flex flex-col gap-3">
            <SettingsCard className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">
                  {t("settings.appearance")}
                </span>
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
                  <SelectValue>
                    {theme === "light"
                      ? t("settings.light")
                      : theme === "dark"
                        ? t("settings.dark")
                        : t("settings.system")}
                  </SelectValue>
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
                <span className="text-sm font-medium">
                  {t("settings.colorTheme")}
                </span>
                <span className="text-xs text-foreground/50">
                  {t("settings.colorThemeDescription")}
                </span>
              </div>
              <Select
                value={colorTheme}
                onValueChange={(value) =>
                  onColorThemeChange((value ?? "pastel") as ColorTheme)
                }
              >
                <SelectTrigger className="w-48 shrink-0">
                  <SelectValue>
                    {t(`settings.colorTheme${colorTheme.charAt(0).toUpperCase()}${colorTheme.slice(1)}` as Parameters<typeof t>[0])}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pastel">
                    {t("settings.colorThemePastel")}
                  </SelectItem>
                  <SelectItem value="classic">
                    {t("settings.colorThemeClassic")}
                  </SelectItem>
                  <SelectItem value="warm">
                    {t("settings.colorThemeWarm")}
                  </SelectItem>
                  <SelectItem value="lavender">
                    {t("settings.colorThemeLavender")}
                  </SelectItem>
                  <SelectItem value="forest">
                    {t("settings.colorThemeForest")}
                  </SelectItem>
                  <SelectItem value="sunset">
                    {t("settings.colorThemeSunset")}
                  </SelectItem>
                  <SelectItem value="confetti">
                    {t("settings.colorThemeConfetti")}
                  </SelectItem>
                  <SelectItem value="seaside">
                    {t("settings.colorThemeSeaside")}
                  </SelectItem>
                  <SelectItem value="storybook">
                    {t("settings.colorThemeStorybook")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </SettingsCard>

            <SettingsCard className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">
                  {t("settings.fontSize")}
                </span>
                <span className="text-xs text-foreground/50">
                  {t("settings.fontSizeDescription")}
                </span>
              </div>
              <Select
                value={fontSize}
                onValueChange={(value) =>
                  onFontSizeChange((value ?? "regular") as FontSizePreference)
                }
              >
                <SelectTrigger className="w-40 shrink-0">
                  <SelectValue>
                    {fontSize === "large"
                      ? t("settings.fontSizeLarge")
                      : fontSize === "extra-large"
                        ? t("settings.fontSizeExtraLarge")
                        : t("settings.fontSizeRegular")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">
                    {t("settings.fontSizeRegular")}
                  </SelectItem>
                  <SelectItem value="large">
                    {t("settings.fontSizeLarge")}
                  </SelectItem>
                  <SelectItem value="extra-large">
                    {t("settings.fontSizeExtraLarge")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </SettingsCard>
          </div>
        </TabsContent>

        <TabsContent value="general" className="pt-4">
          <div className="flex flex-col gap-3">
            <SettingsCard className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">
                  {t("settings.language")}
                </span>
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
                  <SelectValue>
                    {languagePreference === "system"
                      ? t("settings.languageSystem")
                      : languagePreference === "en"
                        ? t("settings.languageEnglish")
                        : t("settings.languageSpanish")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">
                    <span className="flex items-center gap-2">
                      <Monitor size={14} />
                      {t("settings.languageSystem")}
                    </span>
                  </SelectItem>
                  <SelectItem value="en">{t("settings.languageEnglish")}</SelectItem>
                  <SelectItem value="es">{t("settings.languageSpanish")}</SelectItem>
                </SelectContent>
              </Select>
            </SettingsCard>
          </div>
        </TabsContent>

        <TabsContent value="legal" className="pt-4">
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={onGoToTermsOfService}
              className="w-full text-left"
            >
              <SettingsCard className="transition-colors hover:bg-muted/40">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                      <FileText size={16} />
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-medium">
                        {t("settings.termsOfService")}
                      </span>
                      <span className="text-xs text-foreground/50">
                        {t("settings.termsOfServiceDescription")}
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    className="shrink-0 text-foreground/40"
                  />
                </div>
              </SettingsCard>
            </button>

            <button
              type="button"
              onClick={onGoToPrivacyPolicy}
              className="w-full text-left"
            >
              <SettingsCard className="transition-colors hover:bg-muted/40">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                      <Shield size={16} />
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-medium">
                        {t("settings.privacyPolicy")}
                      </span>
                      <span className="text-xs text-foreground/50">
                        {t("settings.privacyPolicyDescription")}
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    className="shrink-0 text-foreground/40"
                  />
                </div>
              </SettingsCard>
            </button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
