import { Nullable } from ".";
import _langs from "./lib/langs";

/**
 * Interface representing language codes.
 */
interface LangCodes {
  [key: string]: string;
}

/**
 * Object containing language codes.
 */
let LANGS: LangCodes = _langs;

/**
 * Gets the standardized language code for a given language.
 * @param lang The language to get the code for.
 * @returns The standardized language code if found, otherwise undefined.
 */
function getLangCode(lang: Nullable<string>): string | undefined {
  if (!lang || typeof lang !== "string") {
    return;
  }

  if (LANGS[lang]) {
    return lang;
  }

  lang = lang.toLowerCase();

  const supportedLangCodes = Object.keys(LANGS);

  for (let i = 0, len = supportedLangCodes.length, code; i < len; i++) {
    code = supportedLangCodes[i];
    if (code.toLowerCase() === lang || LANGS[code].toLowerCase() === lang) {
      return code;
    }
  }
}

/**
 * Checks if a language is supported.
 * @param lang The language to check.
 * @returns True if the language is supported, otherwise false.
 */
function isSupported(lang: string): boolean {
  return !!getLangCode(lang);
}

export { getLangCode, isSupported, LANGS };
