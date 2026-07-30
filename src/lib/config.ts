export const userAgent: string =
  "Mozilla/5.0 (Windows; U; Windows NT 6.3; WOW64; en-US) AppleWebKit/603.43 (KHTML, like Gecko) Chrome/47.0.2805.119 Safari/603";

export const API_AUTH = "https://edge.microsoft.com/translate/auth";
export const API_TRANSLATE =
  "https://api.cognitive.microsofttranslator.com/translate";

/** Refresh the token this long before it actually expires, to avoid racing an in-flight request. */
export const TOKEN_REFRESH_BUFFER_MS = 60_000;

/** Default abort timeout applied to every network call made by this library. */
export const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Documented limits for the `translate` operation.
 * @see https://learn.microsoft.com/azure/ai-services/translator/service-limits#character-and-array-limits-per-request
 */
export const MAX_ARRAY_LENGTH = 1000;
export const MAX_TOTAL_CHARACTERS = 50_000;
