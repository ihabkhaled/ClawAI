import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  THREAD_GENERATION_CODE_KEYS,
  THREAD_START_ERROR_KEYS,
} from '@/constants/thread-generation-progress.constants';
import { en } from '@/lib/i18n/locales/en';

const THREADS_ERROR_ENUM = resolve(
  __dirname,
  '../../../../claw-threads-service/src/common/enums/thread-generation-error-code.enum.ts',
);

const SERVICE_ROOT = resolve(
  __dirname,
  '../../../../claw-thread-generation-service/src/modules/generation',
);
const SERVICE_FILES = [
  'constants/step-recorder.constants.ts',
  'utilities/parse-step-error.utility.ts',
  'utilities/failure-report.utility.ts',
  'managers/generation-pipeline.manager.ts',
  'constants/healing.constants.ts',
  'constants/failure-class.constants.ts',
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
      'HEAL_STOPPED_SPEND_CAP',
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

  it('has a message for every healing strategy and every classifier code (ADR-181)', () => {
    const strategies = readFileSync(
      resolve(
        __dirname,
        '../../../../../packages/shared-types/src/enums/thread-healing-strategy.enum.ts',
      ),
      'utf8',
    );
    const values = [...strategies.matchAll(/=\s*'([A-Z_]+)'/gu)].map((match) => match[1]);
    expect(values.length).toBeGreaterThan(8);
    for (const value of values) {
      expect(THREAD_GENERATION_CODE_KEYS[value ?? ''], value).toBeDefined();
    }
    for (const code of [
      'PROVIDER_REQUEST_TOO_LARGE',
      'PROVIDER_CREDIT_EXHAUSTED',
      'PAYG_PRICING_UNAVAILABLE',
      'CLOUD_PROVIDER_REQUEST_FAILED',
      'CLOUD_PROVIDER_EMPTY_RESPONSE',
    ]) {
      expect(THREAD_GENERATION_CODE_KEYS[code], code).toBeDefined();
    }
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

  it('maps the idle-timeout, ceiling and reasoned-no-answer codes to their own messages', () => {
    expect(THREAD_GENERATION_CODE_KEYS.MODEL_IDLE_TIMEOUT).toBe('modelIdleTimeout');
    expect(THREAD_GENERATION_CODE_KEYS.GENERATION_ATTEMPT_TIMEOUT).toBe('generationAttemptTimeout');
    expect(THREAD_GENERATION_CODE_KEYS.MODEL_HARD_CEILING).toBe('modelHardCeiling');
    expect(THREAD_GENERATION_CODE_KEYS.MODEL_REASONED_NO_ANSWER).toBe('modelReasonedNoAnswer');
  });
});

describe('PAYG and cloud provider codes', () => {
  it('maps the cap, price and cloud-outage codes to their own plain messages', () => {
    expect(THREAD_GENERATION_CODE_KEYS.PAYG_CAP_TOO_LOW).toBe('paygCapTooLow');
    expect(THREAD_GENERATION_CODE_KEYS.PAYG_PRICE_UNAVAILABLE).toBe('paygPriceUnavailable');
    expect(THREAD_GENERATION_CODE_KEYS.CLOUD_PROVIDER_UNAVAILABLE).toBe('cloudProviderUnavailable');
    const { code, hint } = en.chat.threadProgress;
    expect(hint.paygCapTooLow).toMatch(/spend cap/i);
    expect(code.paygPriceUnavailable).toMatch(/no price/i);
    expect(code.cloudProviderUnavailable).toBeTruthy();
  });
});

describe('THREAD_START_ERROR_KEYS', () => {
  const enumCodes = [
    ...readFileSync(THREADS_ERROR_ENUM, 'utf8').matchAll(/=\s*'([A-Z][A-Z0-9_]+)'/gu),
  ]
    .map((match) => match[1])
    .filter((code): code is string => code !== undefined);

  it('finds the refusal codes the Threads API is known to return (guards the scanner)', () => {
    expect(enumCodes).toContain('THREAD_SPEND_CAP_TOO_LOW');
    expect(enumCodes).toContain('MODEL_NOT_ALLOWED_FOR_PLAN');
  });

  it('has a frontend sentence for every code the Threads API refuses a start with', () => {
    expect(enumCodes.filter((code) => THREAD_START_ERROR_KEYS[code] === undefined)).toEqual([]);
  });

  it('points every code at an English sentence', () => {
    const { startError } = en.chat.threadProgress;
    for (const key of Object.values(THREAD_START_ERROR_KEYS)) {
      expect(startError[key as keyof typeof startError], key).toBeTruthy();
    }
  });
});
