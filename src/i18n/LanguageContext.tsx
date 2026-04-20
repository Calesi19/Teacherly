import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { translations, type Language } from "./translations";

const LANG_KEY = "tizara-language";

function getInitialLanguage(): Language {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved === "en" || saved === "es") return saved;
  return navigator.language.startsWith("es") ? "es" : "en";
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
  setLanguage: (lang: Language) => void;
  t: (key: string, vars?: TranslationVars) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = useCallback((lang: Language) => {
    localStorage.setItem(LANG_KEY, lang);
    setLanguageState(lang);
  }, []);

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
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useTranslation must be used inside LanguageProvider");
  return ctx;
}
