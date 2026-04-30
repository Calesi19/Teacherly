import { translations } from "../i18n/translations";
import type { Language } from "../i18n/translations";

export function getReportLocale(language: Language): string {
  return language === "es" ? "es-PR" : "en-US";
}

export function formatReportGender(
  gender: string | null | undefined,
  language: Language,
): string {
  if (!gender) return "—";

  const normalized = gender.trim().toLowerCase();
  const labels = translations[language].studentInfoPage;

  if (normalized === "male" || normalized === "masculino") {
    return labels.male;
  }

  if (normalized === "female" || normalized === "femenino") {
    return labels.female;
  }

  if (normalized === "other" || normalized === "otro") {
    return labels.other;
  }

  return gender;
}

export function formatReportDate(
  value: string | null | undefined,
  language: Language,
): string {
  if (!value) return "—";

  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;

  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return new Intl.DateTimeFormat(getReportLocale(language), {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatReportDateTime(
  value: string | null | undefined,
  language: Language,
): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(getReportLocale(language), {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
