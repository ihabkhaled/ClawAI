import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  NGINX_CHAT_MESSAGES_READ_TIMEOUT_MS,
  SPEECH_FILE_STORE_RESERVE_MS,
  SPEECH_JOB_DEADLINE_MS,
  SPEECH_JOB_LOCK_TTL_MS,
  SPEECH_MAX_TIMEOUT_MS,
  SPEECH_MIN_ATTEMPT_MS,
  SPEECH_POST_PROVIDER_RESERVE_MS,
  SPEECH_SEGMENT_MAX_TIMEOUT_MS,
  SPEECH_SETTLEMENT_RESERVE_MS,
} from '../../constants/speech.constants';
import { ENTITLEMENTS_TIMEOUT_MS } from '../../../../common/constants';
import { speechAttemptTimeoutMs, speechStoreTimeoutMs } from '../speech.utility';

// Found live 2026-09-25 (docs/16-quality-engineering/evidence/2026-09-25-multimodal,
// defect 4): the TTS provider timeout equalled nginx's read timeout for the
// route, so a hung Gemini TTS surfaced as a gateway 504, not TTS_FAILED. The
// request now has ONE end-to-end deadline covering the provider walk AND the
// audio store. This spec reads the real nginx files, so moving either number
// alone fails.
const REPO_ROOT = join(__dirname, '..', '..', '..', '..', '..', '..', '..');
const NGINX_DIR = join(REPO_ROOT, 'infra', 'nginx');
const TIMEOUT_PATTERN = /^\s*proxy_read_timeout\s+(\d+)s;/m;

function httpLevelReadTimeoutMs(file: string): number {
  const match = TIMEOUT_PATTERN.exec(readFileSync(join(NGINX_DIR, file), 'utf8'));
  expect(match, `${file} has an http-level proxy_read_timeout`).not.toBeNull();
  return Number(match?.[1]) * 1000;
}

function chatMessagesLocationBlock(): string {
  const source = readFileSync(join(NGINX_DIR, 'locations.conf'), 'utf8');
  const start = source.indexOf('location /api/v1/chat-messages {');
  expect(start).toBeGreaterThanOrEqual(0);
  return source.slice(start, source.indexOf('}', start));
}

describe('TTS end-to-end deadline vs the nginx read timeout', () => {
  it('mirrors the timeout nginx really applies to /api/v1/chat-messages', () => {
    // The location sets none of its own, so the http-level value binds.
    expect(chatMessagesLocationBlock()).not.toContain('proxy_read_timeout');
    expect(httpLevelReadTimeoutMs('nginx.conf')).toBe(NGINX_CHAT_MESSAGES_READ_TIMEOUT_MS);
    expect(httpLevelReadTimeoutMs('nginx.distributed.conf.template')).toBeGreaterThanOrEqual(
      NGINX_CHAT_MESSAGES_READ_TIMEOUT_MS,
    );
  });

  it('keeps even the slowest single attempt plus its store and settlement inside the nginx window', () => {
    // POST answers 202 at once; synthesis runs in a background job. The
    // longest single provider attempt plus its store and settlement still
    // fits well inside the nginx window — defence in depth, not the contract.
    expect(SPEECH_MAX_TIMEOUT_MS).toBe(SPEECH_SEGMENT_MAX_TIMEOUT_MS);
    expect(SPEECH_SEGMENT_MAX_TIMEOUT_MS + SPEECH_POST_PROVIDER_RESERVE_MS).toBeLessThan(
      NGINX_CHAT_MESSAGES_READ_TIMEOUT_MS,
    );
  });

  it('bounds the background job, and the lock outlives it so a finished job writes under it', () => {
    expect(SPEECH_JOB_DEADLINE_MS).toBeLessThanOrEqual(180_000);
    expect(SPEECH_JOB_LOCK_TTL_MS).toBeGreaterThan(SPEECH_JOB_DEADLINE_MS);
  });

  it('keeps room after the store for the one meter call that settles the hold', () => {
    // The hold is finalized (or released) only AFTER the store, so that call
    // must fit inside the budget too: exactly the meter's own request timeout.
    expect(SPEECH_SETTLEMENT_RESERVE_MS).toBe(ENTITLEMENTS_TIMEOUT_MS);
    expect(SPEECH_POST_PROVIDER_RESERVE_MS).toBe(
      SPEECH_FILE_STORE_RESERVE_MS + SPEECH_SETTLEMENT_RESERVE_MS,
    );
  });
});

describe('speechAttemptTimeoutMs — the provider window is the job deadline minus store + settlement', () => {
  const deadlineAt = 100_000;
  const windowEnd = deadlineAt - SPEECH_POST_PROVIDER_RESERVE_MS;

  it("uses the candidate's own timeout while the window allows", () => {
    expect(speechAttemptTimeoutMs(20_000, 1_000, deadlineAt, 50_000)).toBe(20_000);
  });

  it("cuts to the segment's own timeout (12 s + 60 ms/char) when that is shorter", () => {
    expect(speechAttemptTimeoutMs(40_000, 100, deadlineAt, 50_000)).toBe(18_000);
  });

  it('cuts a candidate to what is left of the window, leaving the store its reserve', () => {
    expect(speechAttemptTimeoutMs(40_000, 1_000, deadlineAt, windowEnd - 20_000)).toBe(20_000);
  });

  it('starts no paid attempt that would leave the store no time', () => {
    expect(
      speechAttemptTimeoutMs(40_000, 1_000, deadlineAt, windowEnd - SPEECH_MIN_ATTEMPT_MS + 1),
    ).toBe(null);
    expect(speechAttemptTimeoutMs(40_000, 1_000, deadlineAt, windowEnd + 1)).toBe(null);
  });
});

describe('speechStoreTimeoutMs', () => {
  const deadlineAt = 100_000;

  it('is the reserve while the deadline allows, and what is left after the settlement reserve', () => {
    expect(speechStoreTimeoutMs(deadlineAt, 50_000)).toBe(SPEECH_FILE_STORE_RESERVE_MS);
    expect(
      speechStoreTimeoutMs(deadlineAt, deadlineAt - SPEECH_SETTLEMENT_RESERVE_MS - 3_000),
    ).toBe(3_000);
  });

  it('is null once only the settlement reserve is left', () => {
    expect(speechStoreTimeoutMs(deadlineAt, deadlineAt - SPEECH_SETTLEMENT_RESERVE_MS)).toBe(null);
    expect(speechStoreTimeoutMs(deadlineAt, deadlineAt)).toBe(null);
  });
});
