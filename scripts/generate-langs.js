import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const userAgent = "Mozilla/5.0 (Windows; U; Windows NT 6.3; WOW64; en-US) AppleWebKit/603.43 (KHTML, like Gecko) Chrome/47.0.2805.119 Safari/603"


const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @typedef {Object} TranslationLanguageItem
 * @property {string} name - The name of the language in English.
 * @property {string} nativeName - The name of the language in its native script.
 * @property {string} dir - The text direction (e.g., "ltr" or "rtl").
 */

/**
 * @typedef {Object} TranslationLanguages
 * @property {Record<string, TranslationLanguageItem>} translation - Map of language codes to their metadata.
 */

/**
 * Formats an object into a string, omitting quotes around valid keys.
 * @param {Record<string, string>} obj - The object to format.
 * @returns {string} - The formatted string.
 */
const stringifyWithOptionalQuotes = (obj) => {
    return (
        '{\n' +
        Object.entries(obj)
            .map(([key, value]) => {
                const formattedKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
                return `\t${formattedKey}: ${JSON.stringify(value)}`;
            })
            .join(',\n') +
        '\n}'
    );
};

(async () => {
    const response = await fetch('https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=translation', {
        headers: {
            'Accept-Language': 'en-US,en',
            'User-Agent': userAgent,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
    }

    /** @type {TranslationLanguages} */
    const { translation: translationLanguages } = await response.json();

    const langMap = Object.entries(translationLanguages).reduce(
        /** @param {Record<string, string>} langCodeMap */
        (langCodeMap, [langCode, langItem]) => {
            langCodeMap[langCode] = langItem.name;
            return langCodeMap;
        },
        {}
    );

    const outputPath = path.resolve(__dirname, '../src/lib/langs.ts');
    const outputContent = `export default ${stringifyWithOptionalQuotes(langMap)};`;

    fs.writeFileSync(outputPath, outputContent, { encoding: 'utf-8' });

    console.log(`✔️ Language map written to ${outputPath}`);
})();
