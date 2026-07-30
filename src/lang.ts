import _langs from "./lib/langs";
import type { Nullable } from "./types";

/** Map of canonical language code -> English display name. */
export const LANGS: Readonly<Record<string, string>> = _langs;

/**
 * Case-insensitive index built once at module load, mapping a lowercased code
 * or lowercased display name to its canonical code. `getLangCode` previously
 * did a fresh O(n) linear scan of ~130 entries on every single call (twice
 * per `translate()` invocation); this makes lookups O(1) instead.
 */
const LOOKUP: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>();
  for (const [code, name] of Object.entries(LANGS)) {
    map.set(code.toLowerCase(), code);
    map.set(name.toLowerCase(), code);
  }
  return map;
})();

/**
 * Resolves a language name or code (in any casing) to its canonical Microsoft Translator code.
 * @param lang The language name or code to resolve.
 * @returns The canonical language code, or `undefined` if unrecognized.
 */
export function getLangCode(lang: Nullable<string>): string | undefined {
  if (!lang || typeof lang !== "string") {
    return undefined;
  }

  if (LANGS[lang]) {
    return lang;
  }

  return LOOKUP.get(lang.toLowerCase());
}

/**
 * Checks whether a language name or code is supported by the Translator service.
 * @param lang The language name or code to check.
 */
export function isSupported(lang: Nullable<string>): boolean {
  return getLangCode(lang) !== undefined;
}
