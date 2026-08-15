import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { en } from '@/lib/i18n/locales/en';
import { ja } from '@/lib/i18n/locales/ja';

function flatten(
  value: unknown,
  prefix = '',
  result: Record<string, string> = {},
): Record<string, string> {
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

const LEGITIMATE_UNCHANGED_VALUES = new Set([
  'you@example.com',
  'Claw',
  'Claw v{version}',
  'Gmail',
  'TTFT',
  'https://api.example.com',
  '{"capability": 0.2, "domain": 0.1, ...}',
  'PDF',
  'PayPal',
  'PayPal/Card',
  'Paymob',
  'P95',
  '{ms}ms',
  'OK',
  'cmnkgdc2c00009w92riuztmmd',
  'AMD ROCm',
  'GPU',
  'CPU',
  'GB RAM',
  'GB VRAM',
  'RAM',
  'CPU MoE',
  'CUDA',
  'ROCm',
  'GitHub',
  '© {year} ClawAI · v{version}',
  'X',
  'LinkedIn',
  '18',
  'AWS Bedrock',
  'Anthropic',
  'DeepSeek',
  'Gemini',
  'Grok',
  'Ollama',
  'Ollama Cloud',
  'OpenAI',
  'llama.cpp',
  'ms',
]);

describe('Japanese dictionary completeness', () => {
  it('defines every English key explicitly without fallback spreads or mojibake', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/lib/i18n/locales/ja.ts'), 'utf8');
    const english = flatten(en);
    const japanese = flatten(ja);

    expect(Object.keys(japanese).sort()).toEqual(Object.keys(english).sort());
    expect(Object.keys(japanese)).toHaveLength(4163);
    expect(source).not.toContain("from './en'");
    expect(source).not.toContain('...en');
    expect(source).not.toContain('ã');
  });

  it('leaves English unchanged only for approved technical terms and proper names', () => {
    const english = flatten(en);
    const japanese = flatten(ja);
    const unchanged = Object.keys(english)
      .filter((key) => english[key] === japanese[key])
      .map((key) => english[key] ?? '')
      .filter((value, index, values) => values.indexOf(value) === index);

    expect(new Set(unchanged)).toEqual(LEGITIMATE_UNCHANGED_VALUES);
  });
});
