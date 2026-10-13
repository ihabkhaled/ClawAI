import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { THREAD_GENERATION_CODE_KEYS } from '@/constants/thread-generation-progress.constants';
import { en } from '@/lib/i18n/locales/en';

const SERVICE_ROOT = resolve(
  __dirname,
  '../../../../claw-thread-generation-service/src/modules/generation',
);
const SERVICE_FILES = [
  'constants/step-recorder.constants.ts',
  'utilities/parse-step-error.utility.ts',
  'utilities/failure-report.utility.ts',
  'managers/generation-pipeline.manager.ts',
  'repositories/generation-jobs.repository.ts',
];
const PATTERNS = [
  /\bcode:\s*'([A-Z][A-Z0-9_]{3,60})'/gu,
  /[sS]afeErrorCode[^'\n;]*?'([A-Z][A-Z0-9_]{3,60})'/gu,
  /_CODE\s*=\s*'([A-Z][A-Z0-9_]{3,60})'/gu,
];
const TERNARY_CODE = /\?\s*'([A-Z][A-Z0-9_]{3,60})'/gu;
const SCORE_LOW_TEMPLATE = /\$\{kind\}_SCORE_LOW/u;

function read(relative: string): string {
  return readFileSync(resolve(SERVICE_ROOT, relative), 'utf8');
}

function collectServiceCodes(): Set<string> {
  const codes = new Set<string>();
  for (const file of SERVICE_FILES) {
    const text = read(file);
    const patterns = file.endsWith('parse-step-error.utility.ts')
      ? [...PATTERNS, TERNARY_CODE]
      : PATTERNS;
    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        if (match[1] !== undefined) {
          codes.add(match[1]);
        }
      }
    }
    if (SCORE_LOW_TEMPLATE.test(text)) {
      codes.add('JUDGE_SCORE_LOW');
      codes.add('CRITIC_SCORE_LOW');
    }
  }
  return codes;
}

describe('THREAD_GENERATION_CODE_KEYS', () => {
  const serviceCodes = collectServiceCodes();

  it('finds the codes the service is known to emit (guards the scanner itself)', () => {
    for (const code of [
      'PROVIDER_ERROR',
      'PROVIDER_RATE_LIMITED',
      'CONSENSUS_NOT_REACHED',
      'FALLBACK_USED',
      'JUDGE_SCORE_LOW',
      'CRITIC_SCORE_LOW',
      'GENERATION_ATTEMPT_RETRY',
      'GENERATION_WORKER_LOST',
      'CANCELLED',
    ]) {
      expect(serviceCodes, code).toContain(code);
    }
  });

  it('has a frontend entry for every code the service can emit', () => {
    const missing = [...serviceCodes].filter(
      (code) => THREAD_GENERATION_CODE_KEYS[code] === undefined,
    );
    expect(missing).toEqual([]);
  });

  it('maps each model-window failure to its own message instead of one catch-all', () => {
    expect(THREAD_GENERATION_CODE_KEYS.MODEL_CATALOG_UNREACHABLE).toBe('modelCatalogUnreachable');
    expect(THREAD_GENERATION_CODE_KEYS.MODEL_CATALOG_REJECTED).toBe('modelCatalogRejected');
    expect(THREAD_GENERATION_CODE_KEYS.CONTEXT_WINDOW_ASSUMED).toBe('contextWindowAssumed');
    expect(THREAD_GENERATION_CODE_KEYS.CONTEXT_WINDOW_EXCEEDED).toBe('contextWindowExceeded');
    // Steps stored before the split still carry the old code, so it stays mapped.
    expect(THREAD_GENERATION_CODE_KEYS.MODEL_CONTEXT_UNAVAILABLE).toBe('modelContextUnavailable');
  });

  it('carries the codes added for leases and checkpoints and drops the retired ones', () => {
    expect(THREAD_GENERATION_CODE_KEYS.LEASE_EXPIRED).toBe('leaseExpired');
    expect(THREAD_GENERATION_CODE_KEYS.RESUMED_FROM_CHECKPOINT).toBe('resumedFromCheckpoint');
    expect(THREAD_GENERATION_CODE_KEYS.RATE_LIMITED).toBeUndefined();
    expect(THREAD_GENERATION_CODE_KEYS.SPEND_CAP_REACHED).toBeUndefined();
  });

  it('points every code at an English message and hint', () => {
    const { code, hint } = en.chat.threadProgress;
    for (const key of Object.values(THREAD_GENERATION_CODE_KEYS)) {
      expect(code[key as keyof typeof code], key).toBeTruthy();
      expect(hint[key as keyof typeof hint], key).toBeTruthy();
    }
  });
});
