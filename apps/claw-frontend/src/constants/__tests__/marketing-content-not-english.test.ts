import { describe, expect, it } from 'vitest';

import { Locale } from '@/enums/locale.enum';

/**
 * A translated marketing dictionary must not carry English sentences copied
 * from `en`. For every `<name>-content/<locale>.constants.ts` folder (and
 * `public-launch-content`), a non-English string of 25+ characters fails when
 * it equals the English string at the same key path.
 *
 * Only strings whose remaining text, after removing product names, model
 * names, URLs, emails and code, has no English words are allowed.
 */
const MIN_LENGTH = 25;

/** Brand, provider, model and product identifiers that stay in Latin script. */
const ALLOWED_TERMS = [
  'ClawAI',
  'OpenAI',
  'Anthropic',
  'Claude',
  'Google Gemini',
  'Gemini',
  'DeepSeek',
  'xAI Grok',
  'Grok',
  'Ollama',
  'llama.cpp',
  'ChatGPT',
  'Copilot',
  'Perplexity',
  'Mistral',
  'Meta',
  'Llama',
  'Qwen',
  'VS Code',
  'Visual Studio Code',
  'GitHub',
  'PayPal',
  'Paymob',
  'RabbitMQ',
  'Next.js',
  'NestJS',
  'AdSense',
  'Docker',
  'Bedrock',
  'AWS',
];

const MODEL_ID_PATTERN = /GPT-[\w.-]+/g;
const URL_PATTERN = /https?:\/\/\S+|[\w.+-]+@[\w.-]+|`[^`]*`|\{[^}]*\}/g;

/** Exact key paths (`<folder>.<path>`) allowed to equal English. Keep tight. */
const ALLOWED_PATHS = new Set<string>([]);

type Flat = Record<string, string>;

function flatten(value: unknown, prefix = '', result: Flat = {}): Flat {
  if (typeof value === 'string') {
    result[prefix] = value;
    return result;
  }
  if (typeof value !== 'object' || value === null) {
    return result;
  }
  for (const [key, child] of Object.entries(value)) {
    flatten(child, prefix === '' ? key : `${prefix}.${key}`, result);
  }
  return result;
}

function hasEnglishProse(value: string): boolean {
  let remainder = value.replaceAll(URL_PATTERN, ' ').replaceAll(MODEL_ID_PATTERN, ' ');
  for (const term of ALLOWED_TERMS) {
    remainder = remainder.replaceAll(term, ' ');
  }
  return /[A-Za-z]{3,}/.test(remainder);
}

type FolderModules = Record<string, Flat>;

const modules = import.meta.glob<Record<string, unknown>>(
  ['../*-content/*.constants.ts', '../public-launch-content/*.constants.ts'],
  { eager: true },
);

const byFolder = new Map<string, Map<string, FolderModules>>();
for (const [path, mod] of Object.entries(modules)) {
  const match = /\.\.\/([\w-]+)\/([a-z]{2})\.constants\.ts$/.exec(path);
  if (!match) {
    continue;
  }
  const [, folder = '', locale = ''] = match;
  const flat: FolderModules = {};
  for (const [exportName, exported] of Object.entries(mod)) {
    const key = exportName.replace(/^[A-Z]{2}_/, '');
    flat[key] = flatten(exported);
  }
  const locales = byFolder.get(folder) ?? new Map<string, FolderModules>();
  locales.set(locale, flat);
  byFolder.set(folder, locales);
}

const nonEnglish = Object.values(Locale).filter((locale) => locale !== Locale.EN);

describe('marketing content is translated, not copied from English', () => {
  it('covers the expected content folders', () => {
    expect(byFolder.has('public-launch-content')).toBe(true);
    expect(byFolder.size).toBeGreaterThan(5);
  });

  for (const locale of nonEnglish) {
    it(`${locale}: no 25+ character string equals the English string at the same path`, () => {
      const offenders: string[] = [];
      for (const [folder, locales] of byFolder) {
        const english = locales.get(Locale.EN);
        const translated = locales.get(locale);
        if (!english) {
          continue;
        }
        if (!translated) {
          offenders.push(`${folder}: missing ${locale} file`);
          continue;
        }
        for (const [exportKey, enFlat] of Object.entries(english)) {
          const localeFlat = translated[exportKey] ?? {};
          for (const [path, enValue] of Object.entries(enFlat)) {
            const fullPath = `${folder}.${exportKey}.${path}`;
            if (enValue.length < MIN_LENGTH || !/\s/.test(enValue)) {
              continue;
            }
            if (localeFlat[path] !== enValue) {
              continue;
            }
            if (ALLOWED_PATHS.has(fullPath) || !hasEnglishProse(enValue)) {
              continue;
            }
            offenders.push(`${fullPath}: ${enValue.slice(0, 60)}`);
          }
        }
      }
      expect(offenders, `${locale} English copies`).toEqual([]);
    });
  }
});
