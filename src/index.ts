import { MicrosoftTranslator } from "./client";
import type { Nullable, TranslateOptions, TranslationResult } from "./types";

export { MicrosoftTranslator } from "./client";
export type { MicrosoftTranslatorOptions } from "./client";
export * from "./errors";
export * from "./lang";
export * as langs from "./lib/langs";
export type {
  AuthConfig,
  Nullable,
  TranslateOptions,
  TranslationResult,
} from "./types";

const defaultTranslator = new MicrosoftTranslator();

/**
 * Translates text using a shared default `MicrosoftTranslator` instance.
 *
 * For isolated token caches (e.g. distinct user agents, multi-tenant apps,
 * or tests), create your own `new MicrosoftTranslator()` instead.
 *
 * @param text Content to be translated.
 * @param from Source language code/name, or `"auto-detect"` / `null` to let Microsoft detect it.
 * @param to Target language code(s) or name(s).
 * @param options Optional translate options.
 * @returns The translation result(s), or `undefined` if `text` is empty.
 */
export function translate(
  text: string | string[],
  from: Nullable<string>,
  to: string | string[],
  options?: TranslateOptions,
): Promise<TranslationResult[] | undefined> {
  return defaultTranslator.translate(text, from, to, options);
}
