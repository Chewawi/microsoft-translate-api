# Microsoft Translate API

[![NPM version](https://img.shields.io/npm/v/microsoft-translate-api.svg?style=flat)](https://www.npmjs.org/package/microsoft-translate-api)
[![Auto Test](https://github.com/Chewawi/microsoft-translate-api/actions/workflows/autotest.yml/badge.svg)](https://github.com/Chewawi/microsoft-translate-api/actions/workflows/autotest.yml)
[![Build](https://github.com/Chewawi/microsoft-translate-api/actions/workflows/transpile.yml/badge.svg)](https://github.com/Chewawi/microsoft-translate-api/actions/workflows/transpile.yml)
[![NPM Downloads](https://img.shields.io/npm/dm/microsoft-translate-api.svg)](https://npmcharts.com/compare/microsoft-translate-api?minimal=true)
[![License](https://img.shields.io/npm/l/microsoft-translate-api.svg)](https://github.com/Chewawi/microsoft-translate-api/blob/main/LICENSE)

A stable, fast, and **free** translator for [Microsoft Translator](https://learn.microsoft.com/azure/ai-services/translator/), built for Node.js and Bun.

- **Zero runtime dependencies.**
- Ships proper ESM + CJS builds with types for both (`.d.mts` / `.d.cts`).
- Typed errors (`UnsupportedLanguageError`, `AuthenticationError`, `ValidationError`, `TranslationRequestError`) instead of opaque `Error`s.
- Requests time out instead of hanging, and a failed auth refresh no longer breaks every future call.
- Simple function API (`translate()`) for one-off calls, or a `MicrosoftTranslator` client for isolated token caches.

## Table of Contents

- [Install](#install)
- [Basic Usage](#basic-usage)
- [Optional Translation Options](#optional-translation-options)
- [Errors](#errors)
- [Using a Dedicated Client](#using-a-dedicated-client)
- [Full Translation Results](#full-translation-results)
- [Supported Languages](#supported-languages)
- [Service Limits](#service-limits)
- [Use Paid Service With Your Private Keys](#use-paid-service-with-your-private-keys)
- [Development](#development)
- [Upgrading from 1.x](#upgrading-from-1x)

## Install

```sh
bun add microsoft-translate-api
```

npm, yarn, and pnpm work too:

```sh
[npm | yarn | pnpm] install microsoft-translate-api
```

Requires Node.js >= 18.17 or Bun (anything with a global `fetch`).

## Basic Usage

### Translate from Auto-Detected Language to Another Language

```javascript
const { translate } = require('microsoft-translate-api')

translate('你好，很高兴认识你！', null, 'en').then(res => {
  console.log(res);
}).catch(err => {
  console.error(err);
});
```

<details>
<summary>Translation result</summary>

```json
[
  {
    "detectedLanguage": {
      "language": "zh-Hans",
      "score": 1
    },
    "translations": [
      {
        "text": "Hello, nice to meet you!",
        "to": "en"
      }
    ]
  }
]
```

</details>

### Translate from Auto-Detected Language to Multiple Languages

```javascript
const { translate } = require('microsoft-translate-api')

translate('你好，很高兴认识你！', null, ['en', 'ja']).then(res => {
  console.log(res);
}).catch(err => {
  console.error(err);
});
```

<details>
<summary>Translation result</summary>

```json
[
  {
    "detectedLanguage": {
      "language": "zh-Hans",
      "score": 1
    },
    "translations": [
      {
        "text": "Hello, nice to meet you!",
        "to": "en"
      },
      {
        "text": "こんにちは、はじめまして!",
        "to": "ja"
      }
    ]
  }
]
```

</details>

### Translate HTML text

```javascript
const { translate } = require('microsoft-translate-api')

const htmlText = `
  <div class="notranslate">This will not be translated.</div>
  <div>This will be translated.</div>
`;
translate(htmlText, null, 'zh-Hans', {
  translateOptions: {
    // Explicitly set textType as `html`. Defaults to `plain`.
    textType: 'html'
  }
}).then(res => {
  console.log(res);
}).catch(err => {
  console.error(err);
});
```

<details>
<summary>Translation result</summary>

```json
[
  {
    "detectedLanguage": {
      "language": "en",
      "score": 1
    },
    "translations": [
      {
        "text": "<div class=\"notranslate\">This will not be translated.</div>\n<div>这将被翻译。</div>",
        "to": "zh-Hans"
      }
    ]
  }
]
```

</details>

## Optional Translation Options

> [Reference](https://learn.microsoft.com/azure/ai-services/translator/reference/v3-0-translate#optional-parameters)

```typescript
interface TranslateOptions {
  translateOptions?: Record<string, string | number | boolean>;
  authenticationHeaders?: Record<string, string>;
  userAgent?: string;
  fetchOptions?: RequestInit;
  /** Aborts the request after this many milliseconds. Defaults to 15000. */
  timeoutMs?: number;
}
```

## Errors

Every error thrown by this library extends `MicrosoftTranslateError`, so you can catch all of
them at once or narrow down to a specific case:

```typescript
const {
  translate,
  MicrosoftTranslateError,
  UnsupportedLanguageError,
  AuthenticationError,
  ValidationError,
  TranslationRequestError,
} = require('microsoft-translate-api')

try {
  await translate('hello', null, 'not-a-real-language')
} catch (err) {
  if (err instanceof UnsupportedLanguageError) {
    // 'from'/'to' isn't a language this API recognizes
  } else if (err instanceof AuthenticationError) {
    // couldn't obtain/refresh the free auth token
  } else if (err instanceof ValidationError) {
    // input exceeds the service's array/character limits
  } else if (err instanceof TranslationRequestError) {
    // the API responded with a non-2xx status; see err.status / err.body
  } else if (err instanceof MicrosoftTranslateError) {
    // any other library error
  }
}
```

## Using a Dedicated Client

`translate()` is a convenience wrapper around a shared default `MicrosoftTranslator` instance.
Create your own instance when you need an isolated token cache — for example, per tenant, or to
use a different `userAgent` without affecting other calls:

```javascript
const { MicrosoftTranslator } = require('microsoft-translate-api')

const client = new MicrosoftTranslator({ userAgent: 'my-app/1.0' })

client.translate('你好，很高兴认识你！', null, 'en').then(res => {
  console.log(res);
});
```

## Full Translation Results

> [Reference](https://learn.microsoft.com/azure/ai-services/translator/reference/v3-0-translate#response-body)

```typescript
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
```

## Supported Languages

Refer to [langs](src/lib/langs.ts).

## Service Limits

[Character and array limits per request](https://learn.microsoft.com/azure/ai-services/translator/service-limits#character-and-array-limits-per-request) —
requests exceeding these throw a `ValidationError` before anything is sent over the network.

> [!NOTE]
> The correction service is not available.

## Use Paid Service With Your Private Keys

```javascript
const { translate } = require('microsoft-translate-api')

translate('你好，很高兴认识你！', null, 'en', {
  authenticationHeaders: {
    // Use private subscription key
    'Ocp-Apim-Subscription-Key': 'YOUR KEY',
    // Or use a JWT token
    'Authorization': 'YOUR TOKEN'
  }
}).then(res => {
  console.log(res);
}).catch(err => {
  console.error(err);
});
```

See also [Authentication](https://learn.microsoft.com/azure/ai-services/translator/reference/v3-0-reference#authentication).

> [!NOTE]
> When using your own keys, the library skips fetching the free token entirely and you're
> responsible for refreshing your own credentials.

## Development

This project uses [Bun](https://bun.sh) for dependency management, testing, and scripts:

```sh
bun install       # install dependencies
bun test          # run the test suite (mocked network, no live requests)
bun run typecheck # tsc --noEmit
bun run lint      # biome check
bun run build     # regenerate src/lib/langs.ts and build dist/
```

## Upgrading from 1.x

Version 2.0 is a full rewrite that fixes several correctness bugs found in 1.x:

- An unsupported `from` language used to be **silently treated as auto-detect**, and an
  unsupported `to` language used to be **silently translated to English** instead of failing.
  Both now throw an `UnsupportedLanguageError`.
- A transient failure while fetching the free auth token used to **permanently break every
  future call** until the process restarted. It now retries correctly.
- The auth JWT was decoded with plain base64 instead of base64url, which could corrupt the
  payload; the auth endpoint's response status was also never checked.
- Requests no longer hang forever — they now time out after `timeoutMs` (default 15s).

The `translate()` function keeps the same signature as before. What changed:

- `MicrosoftTranslator` is the new class-based client (see [Using a Dedicated
  Client](#using-a-dedicated-client)); the previously-exported low-level internals
  (`fetchGlobalConfig`, `ensureAuthentication`, `buildHeaders`, `isTokenExpired`, `GlobalConfig`)
  were implementation details and are no longer part of the public API.
- Errors are now typed (see [Errors](#errors)) instead of plain `Error` instances, and the
  library no longer calls `console.error` internally — handle/log errors yourself.
- The project's own tooling moved from pnpm to Bun; this only affects contributors building
  from source, not consumers of the published package.

## Thanks

> [bing-translate-api](https://github.com/plainheart/bing-translate-api/)
