import { Surface } from "@heroui/react";
import { Breadcrumb } from "../components/Breadcrumb";
import { PageBackButton } from "../components/PageBackButton";
import { useTranslation } from "../i18n/LanguageContext";

interface TermsOfServicePageProps {
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

export function TermsOfServicePage({
  onGoToSettings,
}: TermsOfServicePageProps) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-0 h-full flex-col px-6 py-6 pl-3">
      <Breadcrumb
        items={[
          { label: t("legal.backToSettings"), onClick: onGoToSettings },
          { label: t("legal.terms.breadcrumb") },
        ]}
      />

      <div className="mb-6 flex items-center gap-3">
        <PageBackButton
          label={t("common.back")}
          onClick={onGoToSettings}
        />
        <h2 className="text-2xl font-bold">{t("legal.terms.title")}</h2>
      </div>

      <Surface className="rounded-xl px-5 py-5 overflow-y-auto">
        <div className="flex flex-col gap-6">
          {SECTION_KEYS.map((sectionKey) => (
            <section key={sectionKey} className="flex flex-col gap-2">
              <h3 className="text-base font-semibold">
                {t(`legal.terms.${sectionKey}Title`)}
              </h3>
              <p className="text-sm leading-6 text-foreground/75">
                {t(`legal.terms.${sectionKey}Body`)}
              </p>
            </section>
          ))}
        </div>
      </Surface>
    </div>
  );
}
