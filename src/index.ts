import { userAgent as DEFAULT_USER_AGENT } from "./config.json";
import * as lang from "./lang";

const API_AUTH = "https://edge.microsoft.com/translate/auth";
const API_TRANSLATE = "https://api.cognitive.microsofttranslator.com/translate";

export type Nullable<T> = T | undefined | null;

export interface TranslateOptions {
  translateOptions?: Record<string, any>;
  authenticationHeaders?: Record<string, string>;
  userAgent?: string;
  fetchOptions?: RequestInit;
}

/**
 * See https://learn.microsoft.com/azure/ai-services/translator/reference/v3-0-translate#response-body for full result structure
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
    alignment?: object;
  }[];
  detectedLanguage?: {
    language: string;
    score: number;
  };
}

/**
 * Interface representing the global configuration containing the authentication token and its expiration time.
 */
export interface GlobalConfig {
  token: string;
  tokenExpiresAt: number;
}

let globalConfig: GlobalConfig | undefined;
let globalConfigPromise: Promise<GlobalConfig | void> | undefined;

/**
 * Fetches the global configuration including the authentication token.
 * @param userAgent Optional user agent string.
 * @returns A promise that resolves with the global configuration or void if an error occurs.
 */
async function fetchGlobalConfig(
  userAgent?: string
): Promise<GlobalConfig | void> {
  try {
    const response = await fetch(API_AUTH, {
      headers: {
        "User-Agent": userAgent || DEFAULT_USER_AGENT,
      },
    });
    const authJWT = await response.text();
    const jwtPayload = JSON.parse(
      Buffer.from(authJWT.split(".")[1], "base64").toString("utf-8")
    );
    globalConfig = {
      token: authJWT,
      tokenExpiresAt: jwtPayload.exp * 1000,
    };
  } catch (e: any) {
    console.error("Failed to fetch auth token:", e.message);
    throw new Error("Failed to fetch auth token");
  }
}

/**
 * Checks if the authentication token is expired.
 * @returns True if the token is expired, otherwise false.
 */
function isTokenExpired(): boolean {
  return (
    !globalConfig || (globalConfig.tokenExpiresAt || 0) - Date.now() < 60000
  );
}

/**
 * Translates text from one language to another.
 * @param text Content to be translated.
 * @param from Source language code.
 * @param to Target language code(s).
 * @param options Optional translate options.
 * @returns A promise that resolves with the translated text or undefined if an error occurs.
 */
async function translate(
  text: string | string[],
  from: Nullable<string>,
  to: string | string[],
  options?: TranslateOptions
): Promise<TranslationResult[] | undefined> {
  if (!text || !text.length) {
    return;
  }

  from && from.toLowerCase() === "auto-detect" && (from = undefined);
  from = lang.getLangCode(from);

  if (!Array.isArray(to)) {
    to = [to];
  }
  to = to.map((toLang) => lang.getLangCode(toLang) || "en");

  if (!to.length) {
    to = ["en"];
  }

  const fromSupported = !from || lang.isSupported(from);
  const toSupported = to.every(lang.isSupported);

  if (!fromSupported || !toSupported) {
    throw new Error(
      `Unsupported language(s): ${
        !fromSupported
          ? `'${from}'`
          : !toSupported
          ? to.map((t) => `'${t}'`).join(", ")
          : ""
      }`
    );
  }

  if (!Array.isArray(text)) {
    text = [text];
  }

  options ||= {};

  await ensureAuthentication(options);

  const fetchConfig: RequestInit = {
    headers: buildHeaders(options),
    method: "POST",
    body: JSON.stringify(text.map((txt) => ({ Text: txt }))),
    ...(options?.fetchOptions ?? {}),
  };

  try {
    const searchParams = new URLSearchParams([
      ...to.map((toLang) => ["to", toLang]),
      ...Object.entries({
        "api-version": "3.0",
        from,
        ...(options.translateOptions || {}),
      }).filter(([_, val]) => val != null && val !== ""),
    ] as Array<[string, string]>);

    const response = await fetch(
      `${API_TRANSLATE}?${searchParams}`,
      fetchConfig
    );

    if (!response.ok) {
      const responseBody = await response.json();
      throw new Error(
        `Request failed with status ${response.status}: ${
          response.statusText
        }\n${JSON.stringify(responseBody, null, 2)}`
      );
    }

    return response.json();
  } catch (e: any) {
    console.error(`[ERROR] Failed to translate: ${e.message}`);
    throw e;
  }
}

/**
 * Ensures authentication by fetching the global configuration if necessary.
 * @param options Optional translate options.
 */
async function ensureAuthentication(options?: TranslateOptions) {
  if (!options || !options.authenticationHeaders) {
    if (!globalConfigPromise) {
      globalConfigPromise = fetchGlobalConfig(options?.userAgent);
    }

    await globalConfigPromise;

    if (isTokenExpired()) {
      globalConfigPromise = fetchGlobalConfig(options?.userAgent);
      await globalConfigPromise;
    }
  }
}

/**
 * Builds request headers including authentication headers.
 * @param options Optional translate options.
 * @returns Request headers.
 */
function buildHeaders(options?: TranslateOptions) {
  const headers: Record<string, string | any> = {
    "User-Agent": DEFAULT_USER_AGENT,
    "Content-Type": "application/json",
  };

  if (options && options.authenticationHeaders) {
    headers.Authorization = options.authenticationHeaders;
  } else {
    headers.Authorization = "Bearer " + globalConfig!.token;
  }

  if (options && options.fetchOptions && options.fetchOptions.headers) {
    Object.assign(headers, options.fetchOptions.headers);
  }

  return headers;
}

export { lang, translate };
