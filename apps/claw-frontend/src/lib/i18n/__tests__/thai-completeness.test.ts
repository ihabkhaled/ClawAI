import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { en } from '@/lib/i18n/locales/en';
import { th } from '@/lib/i18n/locales/th';

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
  'Gmail',
  'GitHub',
  'Claw',
  'Claw v{version}',
  'PayPal',
  'Paymob',
  'Jira',
  'Slack',
  'Figma',
  'TTFT',
  'GPU',
  'CPU',
  'RAM',
  'AMD ROCm',
  'ROCm',
  'CUDA',
  'NVIDIA',
  'P95',
  'PDF',
  'llama.cpp',
  '18',
  '{"capability": 0.2, "domain": 0.1, ...}',
  '{ms}ms',
  '© {year} ClawAI · v{version}',
]);

function placeholders(value: string): string[] {
  return value.match(/\{[^{}]+\}/gu)?.sort() ?? [];
}

describe('Thai dictionary completeness', () => {
  it('defines every English key explicitly without fallback spreads or mojibake', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/lib/i18n/locales/th.ts'), 'utf8');
    const english = flatten(en);
    const thai = flatten(th);

    expect(Object.keys(thai).sort()).toEqual(Object.keys(english).sort());
    expect(Object.keys(thai)).toHaveLength(3952);
    expect(source).not.toContain("from './en'");
    expect(source).not.toContain('...en');
    expect(source).not.toContain('à¸');
  });

  it('leaves English unchanged only for approved technical terms and proper names', () => {
    const english = flatten(en);
    const thai = flatten(th);
    const unchanged = Object.keys(english)
      .filter((key) => english[key] === thai[key])
      .map((key) => english[key] ?? '')
      .filter((value, index, values) => values.indexOf(value) === index);

    expect(new Set(unchanged)).toEqual(LEGITIMATE_UNCHANGED_VALUES);
  });

  it('preserves every interpolation placeholder exactly', () => {
    const english = flatten(en);
    const thai = flatten(th);

    const mismatches = Object.keys(english).filter(
      (key) =>
        JSON.stringify(placeholders(thai[key] ?? '')) !==
        JSON.stringify(placeholders(english[key] ?? '')),
    );

    expect(mismatches).toEqual([]);
  });
});
