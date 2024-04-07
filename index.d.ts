interface TranslateOptions {
  translateOptions?: Record<string, object>;
  authenticationHeaders?: Record<string, string>;
  userAgent?: string;
  gotOptions?: GotOptions;
  fetchOptions?: RequestInit;
}

/**
 * See https://learn.microsoft.com/azure/ai-services/translator/reference/v3-0-translate#response-body for full result structure
 */
interface TranslationResult {
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
    alignment?: object;
  }[];
  detectedLanguage?: {
    language: string;
    score: number;
  };
}
