import { LOCALES, type Locale } from "@teacherly/core";
import type { ReactNode } from "react";

import { useLocale } from "../i18n/locale-context";

const LABEL_KEY: Record<Locale, "languageEnglish" | "languageSpanish"> = {
  en: "languageEnglish",
  es: "languageSpanish",
};

/** Lets a visitor pick a language before they have an account to store one on. */
export function LocaleToggle(): ReactNode {
  const { locale, t, setLocale } = useLocale();

  return (
    <div className="locale-toggle">
      <span id="locale-label">{t.settings.language}</span>
      <div role="group" aria-labelledby="locale-label">
        {LOCALES.map((candidate) => (
          <button
            key={candidate}
            type="button"
            aria-pressed={candidate === locale}
            onClick={() => setLocale(candidate)}
          >
            {t.settings[LABEL_KEY[candidate]]}
          </button>
        ))}
      </div>
    </div>
  );
}
