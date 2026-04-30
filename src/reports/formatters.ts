import { translations } from "../i18n/translations";
import type { Language } from "../i18n/translations";

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
