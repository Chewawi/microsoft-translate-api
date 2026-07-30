import {
  AuthenticationError,
  TranslationRequestError,
  UnsupportedLanguageError,
  ValidationError,
} from "./errors";
import { getLangCode } from "./lang";
import {
  API_AUTH,
  API_TRANSLATE,
  DEFAULT_TIMEOUT_MS,
  userAgent as DEFAULT_USER_AGENT,
  MAX_ARRAY_LENGTH,
  MAX_TOTAL_CHARACTERS,
  TOKEN_REFRESH_BUFFER_MS,
} from "./lib/config";
import { decodeJwtPayload } from "./lib/jwt";
import type {
  AuthConfig,
  Nullable,
  TranslateOptions,
  TranslationResult,
} from "./types";

export interface MicrosoftTranslatorOptions {
  /** Overrides the default User-Agent used to mint the free token. */
  userAgent?: string;
}

/**
 * A Microsoft Translator client.
 *
 * Each instance keeps its own cached authentication token, so separate
 * instances never interfere with one another. Use the module-level
 * `translate()` export for simple one-off usage, or create your own
 * instance when you need isolated token caches (e.g. distinct user agents,
 * or test doubles).
 */
export class MicrosoftTranslator {
  #userAgent: string;
  #authConfig?: AuthConfig;
  #authConfigPromise?: Promise<AuthConfig>;

  constructor(options?: MicrosoftTranslatorOptions) {
    this.#userAgent = options?.userAgent ?? DEFAULT_USER_AGENT;
  }

  /**
   * Translates text from one language to another.
   * @param text Content to be translated.
   * @param from Source language code/name, or `"auto-detect"` / `null` to let Microsoft detect it.
   * @param to Target language code(s) or name(s).
   * @param options Optional translate options.
   * @returns The translation result(s), or `undefined` if `text` is empty.
   */
  async translate(
    text: string | string[],
    from: Nullable<string>,
    to: string | string[],
    options?: TranslateOptions,
  ): Promise<TranslationResult[] | undefined> {
    const texts = Array.isArray(text) ? text : text ? [text] : [];
    if (texts.length === 0) {
      return undefined;
    }

    const resolvedFrom = resolveFrom(from);
    const resolvedTo = resolveTo(to);
    validateLimits(texts);

    await this.#ensureAuthentication(options);

    const searchParams = new URLSearchParams([
      ...resolvedTo.map((toLang): [string, string] => ["to", toLang]),
      ...(
        Object.entries({
          "api-version": "3.0",
          from: resolvedFrom,
          ...(options?.translateOptions ?? {}),
        }).filter(([, val]) => val != null && val !== "") as [
          string,
          string | number | boolean,
        ][]
      ).map((entry): [string, string] => [entry[0], String(entry[1])]),
    ]);

    const response = await fetch(`${API_TRANSLATE}?${searchParams}`, {
      method: "POST",
      ...options?.fetchOptions,
      headers: this.#buildHeaders(options),
      body: JSON.stringify(texts.map((txt) => ({ Text: txt }))),
      signal:
        options?.fetchOptions?.signal ??
        AbortSignal.timeout(options?.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new TranslationRequestError(
        response.status,
        response.statusText,
        await safeReadBody(response),
      );
    }

    return (await response.json()) as TranslationResult[];
  }

  #buildHeaders(options?: TranslateOptions): Headers {
    const headers = new Headers({
      "User-Agent": this.#userAgent,
      "Content-Type": "application/json",
    });

    if (options?.fetchOptions?.headers) {
      for (const [key, value] of new Headers(options.fetchOptions.headers)) {
        headers.set(key, value);
      }
    }

    if (options?.authenticationHeaders) {
      for (const [key, value] of Object.entries(
        options.authenticationHeaders,
      )) {
        headers.set(key, value);
      }
    } else {
      if (!this.#authConfig) {
        throw new AuthenticationError(
          "No authentication token available; this is a bug in MicrosoftTranslator",
        );
      }
      headers.set("Authorization", `Bearer ${this.#authConfig.token}`);
    }

    return headers;
  }

  async #ensureAuthentication(options?: TranslateOptions): Promise<void> {
    if (options?.authenticationHeaders) {
      return;
    }

    if (!this.#authConfigPromise) {
      this.#authConfigPromise = this.#fetchAuthConfig(options?.userAgent);
    }
    await this.#settleAuthConfigPromise();

    if (this.#isTokenExpired()) {
      this.#authConfigPromise = this.#fetchAuthConfig(options?.userAgent);
      await this.#settleAuthConfigPromise();
    }
  }

  async #settleAuthConfigPromise(): Promise<void> {
    try {
      this.#authConfig = await this.#authConfigPromise;
    } catch (error) {
      // A transient failure must not poison every future call: clear the
      // cached promise so the next translate() retries instead of forever
      // replaying this same rejection.
      this.#authConfigPromise = undefined;
      throw error;
    }
  }

  async #fetchAuthConfig(userAgent?: string): Promise<AuthConfig> {
    let response: Response;
    try {
      response = await fetch(API_AUTH, {
        headers: { "User-Agent": userAgent ?? this.#userAgent },
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      });
    } catch (e) {
      throw new AuthenticationError("Failed to fetch auth token", {
        cause: e,
      });
    }

    if (!response.ok) {
      throw new AuthenticationError(
        `Failed to fetch auth token: ${response.status} ${response.statusText}`,
      );
    }

    const token = await response.text();
    const payload = decodeJwtPayload(token);

    if (typeof payload.exp !== "number") {
      throw new AuthenticationError(
        "Auth token payload is missing the 'exp' claim",
      );
    }

    return { token, tokenExpiresAt: payload.exp * 1000 };
  }

  #isTokenExpired(): boolean {
    return (
      !this.#authConfig ||
      this.#authConfig.tokenExpiresAt - Date.now() < TOKEN_REFRESH_BUFFER_MS
    );
  }
}

function resolveFrom(from: Nullable<string>): string | undefined {
  if (!from || from.toLowerCase() === "auto-detect") {
    return undefined;
  }

  const code = getLangCode(from);
  if (!code) {
    throw new UnsupportedLanguageError(
      `Unsupported source language: '${from}'`,
    );
  }
  return code;
}

function resolveTo(to: string | string[]): string[] {
  const list = Array.isArray(to) ? to : [to];
  if (list.length === 0) {
    throw new UnsupportedLanguageError(
      "At least one target language is required",
    );
  }

  const codes: string[] = [];
  const unsupported: string[] = [];
  for (const l of list) {
    const code = getLangCode(l);
    if (code) {
      codes.push(code);
    } else {
      unsupported.push(l);
    }
  }

  if (unsupported.length > 0) {
    throw new UnsupportedLanguageError(
      `Unsupported target language(s): ${unsupported
        .map((l) => `'${l}'`)
        .join(", ")}`,
    );
  }

  return codes;
}

function validateLimits(texts: string[]): void {
  if (texts.length > MAX_ARRAY_LENGTH) {
    throw new ValidationError(
      `Cannot translate more than ${MAX_ARRAY_LENGTH} array elements in a single request (got ${texts.length})`,
    );
  }

  const totalChars = texts.reduce((sum, t) => sum + t.length, 0);
  if (totalChars > MAX_TOTAL_CHARACTERS) {
    throw new ValidationError(
      `Total text length (${totalChars}) exceeds the ${MAX_TOTAL_CHARACTERS} character limit per request`,
    );
  }
}

async function safeReadBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}
