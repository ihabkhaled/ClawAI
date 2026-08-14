import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { en } from '@/lib/i18n/locales/en';
import { zh } from '@/lib/i18n/locales/zh';

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
  'Claw',
  'Claw v{version}',
  'Gmail',
  'Jira',
  'Slack',
  'Confluence',
  'Figma',
  '{"capability": 0.2, "domain": 0.1, ...}',
  'PDF',
  'P95',
  '{ms}ms',
  'cmnkgdc2c00009w92riuztmmd',
  'GPU',
  'CPU',
  'CUDA',
  'Ollama',
  'PayPal',
  'PayPal/Card',
  'Paymob',
  'GitHub',
  '© {year} ClawAI · v{version}',
  'X',
  '18',
]);

const placeholders = (value: string): string[] =>
  [...value.matchAll(/\{[^{}]+\}/g)].map((match) => match[0]).sort();

describe('Simplified Chinese dictionary completeness', () => {
  it('defines every English key explicitly without fallback or mojibake', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/lib/i18n/locales/zh.ts'), 'utf8');
    const english = flatten(en);
    const chinese = flatten(zh);
    expect(Object.keys(chinese).sort()).toEqual(Object.keys(english).sort());
    expect(Object.keys(chinese)).toHaveLength(4038);
    expect(source).not.toContain("from './en'");
    expect(source).not.toContain('...en');
    expect(source).not.toContain('ZXPH');
    expect(source).not.toContain('ZXTM');
  });

  it('preserves placeholders and only approved technical values remain unchanged', () => {
    const english = flatten(en);
    const chinese = flatten(zh);
    for (const key of Object.keys(english)) {
      expect(placeholders(chinese[key] ?? ''), key).toEqual(placeholders(english[key] ?? ''));
    }
    const unchanged = Object.keys(english)
      .filter((key) => english[key] === chinese[key])
      .map((key) => english[key] ?? '')
      .filter((value, index, values) => values.indexOf(value) === index);
    expect(new Set(unchanged)).toEqual(LEGITIMATE_UNCHANGED_VALUES);
  });
});
