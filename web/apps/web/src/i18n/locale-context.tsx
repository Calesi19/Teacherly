import { DEFAULT_LOCALE, isLocale, type Locale } from "@teacherly/core";
import { translations, type Translations } from "@teacherly/i18n";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

const STORAGE_KEY = "teacherly.locale";

interface LocaleContextValue {
  locale: Locale;
  /** The dictionary for the active locale. Keys are checked at compile time. */
  t: Translations;
  setLocale(locale: Locale): void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Before sign-in there is no teacher to ask, so the choice is remembered
 * locally and sent along with signup. After sign-in the teacher's stored
 * `locale` is authoritative — see `useSession`.
 */
function readStoredLocale(): Locale {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (isLocale(stored)) return stored;

  const browser = window.navigator.language.slice(0, 2);
  return isLocale(browser) ? browser : DEFAULT_LOCALE;
}

export function LocaleProvider({ children }: { children: ReactNode }): ReactNode {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);

  const setLocale = useCallback((next: Locale) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setLocaleState(next);
    document.documentElement.lang = next;
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, t: translations(locale), setLocale }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (value === null) throw new Error("useLocale must be used inside a LocaleProvider.");
  return value;
}
