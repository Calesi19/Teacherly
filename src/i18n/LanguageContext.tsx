import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { translations, type Language } from "./translations";
import { LANG_KEY } from "../appConfig";

export type LanguagePreference = "system" | "en" | "es";

function resolveSystemLanguage(): Language {
  return navigator.language.startsWith("es") ? "es" : "en";
}

function resolveLanguage(pref: LanguagePreference): Language {
  return pref === "system" ? resolveSystemLanguage() : pref;
}

function getInitialPreference(): LanguagePreference {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved === "en" || saved === "es" || saved === "system") return saved;
  return "system";
}

type TranslationVars = Record<string, string | number>;

function lookupKey(obj: unknown, keys: string[]): string {
  let node = obj;
  for (const k of keys) {
    if (typeof node !== "object" || node === null) return keys.join(".");
    node = (node as Record<string, unknown>)[k];
  }
  return typeof node === "string" ? node : keys.join(".");
}

interface LanguageContextValue {
  language: Language;
  languagePreference: LanguagePreference;
  setLanguage: (pref: LanguagePreference) => void;
  t: (key: string, vars?: TranslationVars) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<LanguagePreference>(getInitialPreference);
  const [language, setLanguageState] = useState<Language>(() => resolveLanguage(getInitialPreference()));

  const setLanguage = useCallback((pref: LanguagePreference) => {
    localStorage.setItem(LANG_KEY, pref);
    setPreferenceState(pref);
    setLanguageState(resolveLanguage(pref));
  }, []);

  // Re-resolve if system language changes (e.g. OS language switch)
  useEffect(() => {
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-language: es)");
    const handler = () => setLanguageState(resolveSystemLanguage());
    media.addEventListener?.("change", handler);
    return () => media.removeEventListener?.("change", handler);
  }, [preference]);

  const t = useCallback((key: string, vars?: TranslationVars): string => {
    const keys = key.split(".");
    let text = lookupKey(translations[language], keys);
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.split(`{${k}}`).join(String(v));
      }
    }
    return text;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, languagePreference: preference, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useTranslation must be used inside LanguageProvider");
  return ctx;
}
