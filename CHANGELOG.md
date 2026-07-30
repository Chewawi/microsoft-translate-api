# microsoft-translate-api

## 2.0.0

### Major Changes

- 81f733d: Full rewrite of the translation client, fixing several correctness bugs and modernizing the
  package:

  - An unsupported `from` language used to be **silently treated as auto-detect**, and an
    unsupported `to` language used to be **silently translated to English** instead of failing.
    Both now throw an `UnsupportedLanguageError`.
  - A transient failure while fetching the free auth token used to **permanently break every
    future call** until the process restarted. It now retries correctly.
  - The auth JWT was decoded with plain base64 instead of base64url, which could corrupt the
    payload; the auth endpoint's response status was also never checked before parsing it.
  - Requests no longer hang forever — they now time out after `timeoutMs` (default 15s).
  - Added typed errors (`MicrosoftTranslateError`, `UnsupportedLanguageError`,
    `AuthenticationError`, `ValidationError`, `TranslationRequestError`) instead of plain `Error`s,
    and the library no longer calls `console.error` internally.
  - Added a `MicrosoftTranslator` class for isolated token caches (e.g. multiple user agents or
    tenants); `translate()` keeps its previous signature and now wraps a shared default instance.
  - Sped up language code lookups from an O(n) scan to an O(1) map built once at module load.

  BREAKING CHANGE: unsupported `from`/`to` languages now throw instead of silently substituting
  auto-detect/English. The previously-exported low-level internals (`fetchGlobalConfig`,
  `buildHeaders`, `ensureAuthentication`, `isTokenExpired`, `GlobalConfig`) were implementation
  details and are no longer part of the public API.
