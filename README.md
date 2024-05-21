# Microsoft Translate API

[![NPM version](https://img.shields.io/npm/v/microsoft-translate-api.svg?style=flat)](https://www.npmjs.org/package/microsoft-translate-api)
[![Auto Test](https://github.com/chewawi/microsoft-translate-api/actions/workflows/autotest.yml/badge.svg)](https://github.com/chewawi/microsoft-translate-api/actions/workflows/autotest.yml)
[![Build](https://github.com/chewawi/microsoft-translate-api/actions/workflows/transpile.yml/badge.svg)](https://github.com/chewawi/microsoft-translate-api/actions/workflows/transpile.yml)
[![NPM Downloads](https://img.shields.io/npm/dm/microsoft-translate-api.svg)](https://npmcharts.com/compare/microsoft-translate-api?minimal=true)
[![License](https://img.shields.io/npm/l/microsoft-translate-api.svg)](https://github.com/tuusuario/microsoft-translate-api/blob/master/LICENSE)

A stable and powerful zero-dependency **free** translator for [Microsoft Translator](https://learn.microsoft.com/azure/ai-services/translator/) designed for Node.js.

## Install

NPM

```
npm install microsoft-translate-api
```

Bun

```
bun add microsoft-translate-api
```

### Basic Usage

#### Translate from Auto-Detected Language to Another Language

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

#### Translate from Auto-Detected Language to Multiple Languages

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

#### Translate HTML text

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

<br/>

### Optional Translation Options

> [Reference](https://learn.microsoft.com/azure/ai-services/translator/reference/v3-0-translate#optional-parameters)

```typescript
interface TranslateOptions {
  translateOptions?: Record<string, object>;
  authenticationHeaders?: Record<string, string>;
  userAgent?: string;
  fetchOptions?: RequestInit;
}
```

### Full Translation Results

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

<br/>

### Supported Languages

Refer to [lang.json](src/lang.json).

### Service Limits

<https://learn.microsoft.com/azure/ai-services/translator/service-limits#character-and-array-limits-per-request>

> [!NOTE]
> Note that the correction service is not available.

### Use Paid Service With Your Private Keys

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

See also <https://learn.microsoft.com/azure/ai-services/translator/reference/v3-0-reference#authentication>

> [!NOTE]
> Note that using your private keys, the translator will skip to fetch the free authorization and you will have to check if the authorization is expired by yourself.

## Credits
>
> [bing-translate-api](https://github.com/plainheart/bing-translate-api/) - This package literally would never exist without this.
