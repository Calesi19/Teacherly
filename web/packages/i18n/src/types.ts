import type en from "./en";

/**
 * The shape every locale must satisfy, derived from `en`. English is the source
 * of truth: add a key there and `es` stops compiling until it is translated.
 */
export type Translations = typeof en;

/** e.g. `"auth"` | `"common"` | … */
export type Section = keyof Translations;
