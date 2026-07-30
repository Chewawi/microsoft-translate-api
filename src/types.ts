export type Nullable<T> = T | undefined | null;

export interface TranslateOptions {
  /** Extra query parameters forwarded as-is to the `translate` endpoint (e.g. `textType`, `profanityAction`). */
  translateOptions?: Record<string, string | number | boolean>;
  /** Use your own Azure subscription instead of the free edge token. */
  authenticationHeaders?: Record<string, string>;
  /** Overrides the default User-Agent used to mint the free token. */
  userAgent?: string;
  /** Merged into the underlying `fetch` call for the translate request. */
  fetchOptions?: RequestInit;
  /** Aborts the request after this many milliseconds. Defaults to 15000. Ignored if `fetchOptions.signal` is set. */
  timeoutMs?: number;
}

/**
 * See https://learn.microsoft.com/azure/ai-services/translator/reference/v3-0-translate#response-body for the full result structure.
 */
export interface TranslationResult {
  translations: {
    text: string;
    to: string;
    sentLen?: {
      srcSentLen: number[];
      transSentLen: number[];
    };
    transliteration?: {
      script: string;
      text: string;
    };
    alignment?: {
      proj: string;
    };
  }[];
  detectedLanguage?: {
    language: string;
    score: number;
  };
}

/** The cached free-tier authentication token and its expiry. */
export interface AuthConfig {
  token: string;
  tokenExpiresAt: number;
}
