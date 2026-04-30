import { Surface } from "@heroui/react";
import { Breadcrumb } from "../components/Breadcrumb";
import { PageBackButton } from "../components/PageBackButton";
import { useTranslation } from "../i18n/LanguageContext";

interface PrivacyPolicyPageProps {
  onGoToSettings: () => void;
}

const SECTION_KEYS = [
  "section1",
  "section2",
  "section3",
  "section4",
  "section5",
  "section6",
] as const;

export function PrivacyPolicyPage({ onGoToSettings }: PrivacyPolicyPageProps) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-0 h-full flex-col px-6 pt-8 pb-6 pl-3">
      <Breadcrumb
        items={[
          { label: t("legal.backToSettings"), onClick: onGoToSettings },
          { label: t("legal.privacy.breadcrumb") },
        ]}
      />

      <div className="mb-6 flex items-start gap-3">
        <PageBackButton label={t("common.back")} onClick={onGoToSettings} />
        <div>
          <h2 className="text-2xl font-bold">{t("legal.privacy.title")}</h2>
        </div>
      </div>

      <Surface className="rounded-xl px-5 py-5 overflow-y-auto">
        <div className="flex flex-col gap-6">
          {SECTION_KEYS.map((sectionKey) => (
            <section key={sectionKey} className="flex flex-col gap-2">
              <h3 className="text-base font-semibold">
                {t(`legal.privacy.${sectionKey}Title`)}
              </h3>
              <p className="text-sm leading-6 text-foreground/75">
                {t(`legal.privacy.${sectionKey}Body`)}
              </p>
            </section>
          ))}
        </div>
      </Surface>
    </div>
  );
}
