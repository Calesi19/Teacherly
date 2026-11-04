import type { Locale } from "@teacherly/core";

import en from "./en";
import es from "./es";
import type { Translations } from "./types";

export type { Section, Translations } from "./types";

const DICTIONARIES: Record<Locale, Translations> = { en, es };

/** The whole dictionary for one locale. Unknown keys are a type error at use. */
export function translations(locale: Locale): Translations {
  return DICTIONARIES[locale];
}

/**
 * Fill `{placeholder}` slots. Kept deliberately dumb — no plurals, no dates,
 * no number formatting. When this chunk's successors need those, that is the
 * moment to reconsider pulling in a real i18n library.
 */
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}
