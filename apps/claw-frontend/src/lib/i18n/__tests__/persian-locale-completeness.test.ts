import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { en } from '@/lib/i18n/locales/en';
import { fa } from '@/lib/i18n/locales/fa';

const PERSIAN_LETTER_PATTERN = /[\u0621-\u063A\u0641-\u064A\u067E\u0686\u0698\u06A9\u06AF\u06CC]/u;
const PLACEHOLDER_PATTERN = /\{([^}]+)\}/gu;
const TECHNICAL_VALUE_ALLOWLIST = new Set([
  'API',
  'Anthropic',
  'AWS Bedrock',
  'Claw',
  'ClawAI',
  'Claude',
  'DeepSeek',
  'Gemini',
  'GitHub',
  'GLM',
  'GPT',
  'HTTP',
  'JSON',
  'Kimi',
  'Llama',
  'Mistral',
  'OAuth',
  'Ollama',
  'Ollama Cloud',
  'OpenAI',
  'Grok',
  'PayPal',
  'PayPal/Card',
  'Paymob',
  'Qwen',
  'Stripe',
  'URL',
  'VS Code',
  'N/A',
  'Claw v{version}',
  'you@example.com',
  'Gmail',
  'Jira',
  'Slack',
  'Figma',
  'TTFT',
  '{"capability": 0.2, "domain": 0.1, ...}',
  'PDF',
  'P95',
  '{ms}ms',
  'AUTO · {model}',
  'cmnkgdc2c00009w92riuztmmd',
  'NVIDIA',
  'AMD ROCm',
  'GPU',
  'CPU',
  'RAM',
  'ETA',
  'CPU MoE',
  'CUDA',
  'ROCm',
  'llama.cpp',
  '© {year} ClawAI · v{version}',
  'X',
  '18',
  'https://api.example.com',
]);

function flatten(value: unknown, prefix = '', result: Record<string, string> = {}) {
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

function placeholders(value: string): string[] {
  return [...value.matchAll(PLACEHOLDER_PATTERN)].map((match) => match[1] ?? '').sort();
}

describe('Persian locale completeness', () => {
  const english = flatten(en);
  const persian = flatten(fa);

  it('is an explicit dictionary without importing or spreading English', () => {
    const source = readFileSync(path.join(process.cwd(), 'src/lib/i18n/locales/fa.ts'), 'utf8');
    expect(source).not.toContain("from './en'");
    expect(source).not.toMatch(/\.\.\.en(?:\.|[,}\s])/u);
  });

  it('matches every English key and placeholder exactly', () => {
    expect(Object.keys(persian).sort()).toEqual(Object.keys(english).sort());
    const mismatches = Object.keys(english).filter(
      (key) =>
        placeholders(persian[key] ?? '').join('|') !== placeholders(english[key] ?? '').join('|'),
    );
    expect(mismatches).toEqual([]);
  });

  it('contains native Persian for every non-technical user-facing value', () => {
    const untranslated: string[] = [];
    const withoutPersian: string[] = [];
    for (const [key, englishValue] of Object.entries(english)) {
      const persianValue = persian[key] ?? '';
      if (TECHNICAL_VALUE_ALLOWLIST.has(englishValue)) {
        continue;
      }
      if (persianValue === englishValue) {
        untranslated.push(`${key}=${englishValue}`);
      }
      if (!PERSIAN_LETTER_PATTERN.test(persianValue)) {
        withoutPersian.push(`${key}=${persianValue}`);
      }
    }
    expect(untranslated).toEqual([]);
    expect(withoutPersian).toEqual([]);
  });
});
