/**
 * Base class for every error thrown by this library.
 * Lets consumers do `err instanceof MicrosoftTranslateError` to catch all
 * library-originated failures at once, as opposed to generic `Error`s
 * bubbling up from unrelated code.
 */
export class MicrosoftTranslateError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
  }
}

/** Thrown when the free authentication token could not be obtained or was invalid. */
export class AuthenticationError extends MicrosoftTranslateError {}

/** Thrown when a `from`/`to` language code is not recognized by the Translator service. */
export class UnsupportedLanguageError extends MicrosoftTranslateError {}

/** Thrown when input violates the Translator service's documented request limits. */
export class ValidationError extends MicrosoftTranslateError {}

/** Thrown when the Translator API responds with a non-2xx status code. */
export class TranslationRequestError extends MicrosoftTranslateError {
  readonly status: number;
  readonly statusText: string;
  readonly body: unknown;

  constructor(status: number, statusText: string, body: unknown) {
    super(
      `Translation request failed with status ${status}: ${statusText}\n${JSON.stringify(
        body,
        null,
        2,
      )}`,
    );
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}
