import { describe, expect, it } from 'vitest';

import { SpeechProvider } from '../../../../common/enums';
import { SpeechProviderError } from '../../../../common/errors';
import {
  geminiSpeechOutputTokens,
  measuredSpeechUsage,
  segmentTimeoutMs,
  speechFilename,
  speechReleaseReason,
  speechRequestId,
  speechSettlement,
  toSpeechCandidates,
} from '../speech.utility';

const row = (provider: string, modelAlias: string, timeoutMs = 60_000) => ({
  provider,
  modelAlias,
  timeoutMs,
  maxTokens: 16_384,
});

describe('toSpeechCandidates', () => {
  it('keeps Gemini -tts models and OpenAI per-character models, in order', () => {
    expect(
      toSpeechCandidates([
        row('GEMINI', 'gemini-2.5-flash-preview-tts'),
        row('OPENAI', 'tts-1'),
        row('OPENAI', 'tts-1-hd'),
      ]).map((candidate) => [candidate.provider, candidate.model]),
    ).toEqual([
      [SpeechProvider.GEMINI, 'gemini-2.5-flash-preview-tts'],
      [SpeechProvider.OPENAI, 'tts-1'],
      [SpeechProvider.OPENAI, 'tts-1-hd'],
    ]);
  });

  it.each([
    ['a provider with no speech adapter', row('ANTHROPIC', 'claude-x-tts')],
    ['gpt-4o-mini-tts (no usage to settle on)', row('OPENAI', 'gpt-4o-mini-tts')],
    ['a Gemini text model', row('GEMINI', 'gemini-2.5-flash')],
    ['a local provider', row('OLLAMA', 'piper-tts')],
  ])('skips %s', (_label, wire) => {
    expect(toSpeechCandidates([wire])).toEqual([]);
  });

  it('clamps an over-long timeout and defaults a missing one', () => {
    const [long, missing] = toSpeechCandidates([
      row('OPENAI', 'tts-1', 900_000),
      row('OPENAI', 'tts-1', 0),
    ]);
    // Both land on the provider window: nginx 60 s - 10 s headroom - 10 s store
    // reserve - 5 s settlement reserve (the hold is settled after the store).
    expect(long?.timeoutMs).toBe(40_000);
    expect(missing?.timeoutMs).toBe(40_000);
  });
});

describe('speechSettlement - measured units, captured before the store', () => {
  const held = {
    hold: {
      metered: true,
      maxOutputTokens: 16_000,
      clamped: false,
      reservationId: 'res-1',
      heldMicroUsd: 1_000,
      availableAfterMicroUsd: 0,
      reason: null,
    },
    requestId: 'tts:m:h:g1:1',
    promptTokens: 30,
    outputTokens: 900,
  };

  it('settles OpenAI on the characters sent, zero tokens', () => {
    const openai = { provider: SpeechProvider.OPENAI, model: 'tts-1', timeoutMs: 1, maxTokens: 1 };
    expect(speechSettlement(held, openai, 1_234, null)).toEqual({
      held,
      usage: { promptTokens: 0, completionTokens: 0, cachedPromptTokens: 0, reasoningTokens: 0 },
      calls: { toolCalls: 0, ttsCharacters: 1_234 },
    });
  });

  it('settles Gemini on usageMetadata, or the reserved estimate when it reported none', () => {
    const gemini = {
      provider: SpeechProvider.GEMINI,
      model: 'gemini-2.5-flash-preview-tts',
      timeoutMs: 1,
      maxTokens: 1,
    };
    expect(
      speechSettlement(held, gemini, 50, { promptTokens: 21, completionTokens: 740 }).usage,
    ).toEqual({
      promptTokens: 21,
      completionTokens: 740,
      cachedPromptTokens: 0,
      reasoningTokens: 0,
    });
    expect(speechSettlement(held, gemini, 50, null).usage).toEqual({
      promptTokens: 30,
      completionTokens: 900,
      cachedPromptTokens: 0,
      reasoningTokens: 0,
    });
    expect(speechSettlement(held, gemini, 50, null).calls).toEqual({ toolCalls: 0 });
  });
});

describe('speechRequestId', () => {
  it('is distinct per attempt, segment, generation and spoken text', () => {
    const ids = new Set([
      speechRequestId('m1', 'hash-a', 1, 0, 1),
      speechRequestId('m1', 'hash-a', 1, 0, 2),
      speechRequestId('m1', 'hash-a', 1, 1, 1),
      speechRequestId('m1', 'hash-a', 2, 0, 1),
      speechRequestId('m1', 'hash-b', 1, 0, 1),
      speechRequestId('m2', 'hash-a', 1, 0, 1),
    ]);
    expect(ids.size).toBe(6);
    expect(speechRequestId('m1', 'hash-a', 1, 0, 1)).toBe('tts:m1:hash-a:g1:seg1:1');
  });

  it('fits the meter requestId limit (128) for the longest message id', () => {
    expect(speechRequestId('x'.repeat(64), 'a'.repeat(16), 999, 99, 9).length).toBeLessThanOrEqual(
      128,
    );
  });
});

describe('segmentTimeoutMs', () => {
  it('is 12 s plus 60 ms per character, capped at 40 s', () => {
    expect(segmentTimeoutMs(0)).toBe(12_000);
    expect(segmentTimeoutMs(160)).toBe(21_600);
    expect(segmentTimeoutMs(600)).toBe(40_000);
    expect(segmentTimeoutMs(10_000)).toBe(40_000);
  });
});

describe('geminiSpeechOutputTokens', () => {
  it('reserves 4 tokens per character within the admin ceiling', () => {
    expect(geminiSpeechOutputTokens(1_000, 16_384)).toBe(4_000);
    expect(geminiSpeechOutputTokens(10_000, 16_384)).toBe(16_384);
    expect(geminiSpeechOutputTokens(0, 16_384)).toBe(1);
  });
});

describe('measuredSpeechUsage', () => {
  it('uses the measured usage, or the reserved estimate when none was reported', () => {
    expect(measuredSpeechUsage({ promptTokens: 5, completionTokens: 9 }, 50, 90)).toEqual({
      promptTokens: 5,
      completionTokens: 9,
    });
    expect(measuredSpeechUsage(null, 50, 90)).toEqual({ promptTokens: 50, completionTokens: 90 });
  });
});

describe('speechReleaseReason', () => {
  it('names a deadline TIMEOUT and anything else PROVIDER_ERROR', () => {
    expect(speechReleaseReason(new SpeechProviderError('x', null, true))).toBe('TIMEOUT');
    expect(speechReleaseReason(new SpeechProviderError('x', 500, false))).toBe('PROVIDER_ERROR');
    expect(speechReleaseReason(new Error('boom'))).toBe('PROVIDER_ERROR');
  });
});

describe('speechFilename', () => {
  it('names one file per segment by message, 1-based position and container', () => {
    expect(speechFilename('cm1abc', 'audio/wav', 0)).toBe('reply-cm1abc-1.wav');
    expect(speechFilename('cm1abc', 'audio/mpeg', 2)).toBe('reply-cm1abc-3.mp3');
    expect(speechFilename('../etc/passwd', 'audio/wav', 0)).toBe('reply-etcpasswd-1.wav');
  });
});
