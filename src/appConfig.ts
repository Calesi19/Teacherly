export const APP_NAME = "Teacherly";
export const DB_URL = "sqlite:teacherly.db";

export const LAST_GROUP_KEY = "teacherly-last-group-id";
export const LANG_KEY = "teacherly-language";
export const REPORTS_LAST_DIR_KEY = "teacherly-reports-folder";
export const RECENT_COMMANDS_KEY = "teacherly-recent-commands";

const LEGACY_TO_CURRENT_STORAGE_KEYS = [
  ["tizara-last-group-id", LAST_GROUP_KEY],
  ["tizara-language", LANG_KEY],
  ["tizara-reports-folder", REPORTS_LAST_DIR_KEY],
] as const;

export function migrateLegacyAppStorage() {
  for (const [legacyKey, currentKey] of LEGACY_TO_CURRENT_STORAGE_KEYS) {
    const currentValue = localStorage.getItem(currentKey);
    if (currentValue !== null) continue;

    const legacyValue = localStorage.getItem(legacyKey);
    if (legacyValue === null) continue;

    localStorage.setItem(currentKey, legacyValue);
  }
}
