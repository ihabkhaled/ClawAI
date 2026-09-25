import { describe, expect, it } from 'vitest';

import { SpeechProvider } from '../../../../common/enums';
import { SpeechProviderError } from '../../../../common/errors';
import {
  geminiSpeechOutputTokens,
  measuredSpeechUsage,
  readStoredSpeech,
  speechFilename,
  speechReleaseReason,
  speechRequestId,
  toSpeechCandidates,
  withStoredSpeech,
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
    // Both land on the provider window: nginx 60 s − 10 s headroom − 10 s store reserve.
    expect(long?.timeoutMs).toBe(40_000);
    expect(missing?.timeoutMs).toBe(40_000);
  });
});

describe('speechRequestId', () => {
  it('is distinct per attempt, per generation and per spoken text', () => {
    const ids = new Set([
      speechRequestId('m1', 'hash-a', 1, 0),
      speechRequestId('m1', 'hash-a', 1, 1),
      speechRequestId('m1', 'hash-a', 2, 0),
      speechRequestId('m1', 'hash-b', 1, 0),
      speechRequestId('m2', 'hash-a', 1, 0),
    ]);
    expect(ids.size).toBe(5);
    expect(speechRequestId('m1', 'hash-a', 1, 0)).toBe('tts:m1:hash-a:g1:1');
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
  it('names the file by message and container', () => {
    expect(speechFilename('cm1abc', 'audio/wav')).toBe('reply-cm1abc.wav');
    expect(speechFilename('cm1abc', 'audio/mpeg')).toBe('reply-cm1abc.mp3');
    expect(speechFilename('../etc/passwd', 'audio/wav')).toBe('reply-etcpasswd.wav');
  });
});

describe('readStoredSpeech / withStoredSpeech', () => {
  const speech = {
    fileId: 'f1',
    filename: 'reply-m1.wav',
    mimeType: 'audio/wav',
    provider: 'GEMINI',
    model: 'gemini-2.5-flash-preview-tts',
    characters: 12,
    truncated: false,
    contentHash: 'abc',
    generation: 2,
  };

  it('round-trips and keeps every other metadata key', () => {
    const merged = withStoredSpeech({ fileIds: ['a'], paygClamped: false }, speech);
    expect(merged).toEqual({ fileIds: ['a'], paygClamped: false, speech });
    expect(readStoredSpeech(merged)).toEqual(speech);
  });

  it('starts from an empty object when metadata is null or not an object', () => {
    expect(withStoredSpeech(null, speech)).toEqual({ speech });
    expect(withStoredSpeech(['x'], speech)).toEqual({ speech });
  });

  it.each([
    ['null metadata', null],
    ['no speech key', { other: 1 }],
    ['speech without a fileId', { speech: { contentHash: 'abc' } }],
    ['speech without a hash', { speech: { fileId: 'f1' } }],
    ['speech as a string', { speech: 'f1' }],
  ])('reads nothing from %s', (_label, metadata) => {
    expect(readStoredSpeech(metadata)).toBeNull();
  });
});
