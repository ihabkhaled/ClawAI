import { SpeechUnavailableReason } from '@claw/shared-types';
import { describe, expect, it } from 'vitest';

import { MESSAGE_SPEECH_MAX_POLLS } from '@/constants/message-speech.constants';
import { MessageSpeechJobStatus } from '@/enums/message-speech-job-status.enum';
import { MessageSpeechPlaybackPhase } from '@/enums/message-speech-playback-phase.enum';
import { MessageSpeechStatus } from '@/enums/message-speech-status.enum';
import { ApiClientError } from '@/services/shared/api-client';
import type { MessageSpeechState } from '@/types/message-speech.types';
import {
  deriveMessageSpeechPhase,
  deriveMessageSpeechStatus,
  firstSpeechSegmentIndex,
  isMessageSpeechPollExpired,
  nextMessageSpeechPollInterval,
  nextSpeechSegmentIndex,
  resolveMessageSpeechErrorKey,
  resolveSpeechPlayerErrorKey,
  resolveSpeechUnavailableKey,
  toMessageSpeechSnapshot,
} from '@/utilities/message-speech.utility';

function state(
  status: MessageSpeechJobStatus,
  indices: number[],
  totalSegments = 4,
): MessageSpeechState {
  return {
    status,
    segments: indices.map((index) => ({
      index,
      fileId: `f${String(index)}`,
      mimeType: 'audio/wav',
      characters: 100,
    })),
    totalSegments,
    truncated: false,
    errorCode: null,
  };
}

function apiError(code: string | undefined, status = 400): ApiClientError {
  return new ApiClientError({ message: 'refused', status, code });
}

describe('resolveMessageSpeechErrorKey', () => {
  it.each([
    ['PLAN_FEATURE_DISABLED', 403, 'chat.speech.errors.planDisabled'],
    ['ENTITY_NOT_FOUND', 404, 'chat.speech.errors.notFound'],
    ['TTS_NOTHING_TO_READ', 422, 'chat.speech.errors.nothingToRead'],
    ['TTS_UNAVAILABLE', 503, 'chat.speech.errors.unavailable'],
    ['TTS_FAILED', 502, 'chat.speech.errors.failed'],
    ['PAYG_CREDIT_EXHAUSTED', 402, 'billing.errors.PAYG_CREDIT_EXHAUSTED'],
    ['PAYG_PROMPT_TOO_EXPENSIVE', 402, 'billing.errors.PAYG_PROMPT_TOO_EXPENSIVE'],
    ['PAYG_MODEL_UNPRICED', 402, 'billing.errors.PAYG_MODEL_UNPRICED'],
    ['PAYG_PRICING_UNAVAILABLE', 402, 'billing.errors.PAYG_PRICING_UNAVAILABLE'],
  ])('maps %s (%i) to %s', (code, status, key) => {
    expect(resolveMessageSpeechErrorKey(apiError(code, status))).toBe(key);
  });

  it('falls back to the generic message for an unknown code, a missing code, or a non-API error', () => {
    expect(resolveMessageSpeechErrorKey(apiError('SOMETHING_NEW'))).toBe(
      'chat.speech.errors.generic',
    );
    expect(resolveMessageSpeechErrorKey(apiError(undefined, 500))).toBe(
      'chat.speech.errors.generic',
    );
    // A known code the speech surface does not name still reads as generic.
    expect(resolveMessageSpeechErrorKey(apiError('INVALID_CREDENTIALS'))).toBe(
      'chat.speech.errors.generic',
    );
    expect(resolveMessageSpeechErrorKey(new Error('network'))).toBe('chat.speech.errors.generic');
    expect(resolveMessageSpeechErrorKey({ code: 'TTS_FAILED' })).toBe('chat.speech.errors.generic');
  });
});

describe('resolveSpeechUnavailableKey', () => {
  it('names every reason, and reads a missing reason as temporary', () => {
    expect(resolveSpeechUnavailableKey(SpeechUnavailableReason.PLAN_DISABLED)).toBe(
      'chat.speech.unavailable.planDisabled',
    );
    expect(resolveSpeechUnavailableKey(SpeechUnavailableReason.NO_VOICE_CONFIGURED)).toBe(
      'chat.speech.unavailable.noVoice',
    );
    expect(resolveSpeechUnavailableKey(SpeechUnavailableReason.TEMPORARILY_UNAVAILABLE)).toBe(
      'chat.speech.unavailable.temporarilyUnavailable',
    );
    expect(resolveSpeechUnavailableKey(null)).toBe(
      'chat.speech.unavailable.temporarilyUnavailable',
    );
  });
});

describe('deriveMessageSpeechStatus', () => {
  const base = { isPending: false, isOpen: false, isError: false, state: undefined };

  it('is loading while the start request is in flight, even before the flag settles', () => {
    expect(deriveMessageSpeechStatus({ ...base, isPending: true })).toBe(
      MessageSpeechStatus.LOADING,
    );
  });

  it('stays loading while open until the first segment exists, then plays', () => {
    const generating = state(MessageSpeechJobStatus.GENERATING, []);
    expect(deriveMessageSpeechStatus({ ...base, isOpen: true, state: generating })).toBe(
      MessageSpeechStatus.LOADING,
    );
    const first = state(MessageSpeechJobStatus.GENERATING, [0]);
    expect(deriveMessageSpeechStatus({ ...base, isOpen: true, state: first })).toBe(
      MessageSpeechStatus.PLAYING,
    );
    expect(deriveMessageSpeechStatus({ ...base, state: first })).toBe(MessageSpeechStatus.IDLE);
  });

  it('is an error while open over a refused start or a FAILED job', () => {
    expect(deriveMessageSpeechStatus({ ...base, isOpen: true, isError: true })).toBe(
      MessageSpeechStatus.ERROR,
    );
    const failed = state(MessageSpeechJobStatus.FAILED, []);
    expect(deriveMessageSpeechStatus({ ...base, isOpen: true, state: failed })).toBe(
      MessageSpeechStatus.ERROR,
    );
    expect(deriveMessageSpeechStatus({ ...base, isError: true })).toBe(MessageSpeechStatus.IDLE);
  });
});

describe('polling is bounded', () => {
  it('polls every 700 ms only while GENERATING and under the cap', () => {
    const generating = state(MessageSpeechJobStatus.GENERATING, []);
    expect(nextMessageSpeechPollInterval(generating, 0)).toBe(700);
    expect(nextMessageSpeechPollInterval(generating, MESSAGE_SPEECH_MAX_POLLS - 1)).toBe(700);
    expect(nextMessageSpeechPollInterval(generating, MESSAGE_SPEECH_MAX_POLLS)).toBe(false);
    for (const status of [
      MessageSpeechJobStatus.READY,
      MessageSpeechJobStatus.PARTIAL,
      MessageSpeechJobStatus.FAILED,
      MessageSpeechJobStatus.NONE,
    ]) {
      expect(nextMessageSpeechPollInterval(state(status, [0]), 0)).toBe(false);
    }
    expect(nextMessageSpeechPollInterval(undefined, 0)).toBe(false);
  });

  it('caps at the 3-minute job deadline, and says so only while still GENERATING', () => {
    expect(MESSAGE_SPEECH_MAX_POLLS * 700).toBeGreaterThanOrEqual(180_000);
    expect(MESSAGE_SPEECH_MAX_POLLS).toBeLessThanOrEqual(260);
    const generating = state(MessageSpeechJobStatus.GENERATING, []);
    expect(isMessageSpeechPollExpired(generating, MESSAGE_SPEECH_MAX_POLLS)).toBe(true);
    expect(isMessageSpeechPollExpired(generating, 3)).toBe(false);
    expect(
      isMessageSpeechPollExpired(
        state(MessageSpeechJobStatus.READY, [0]),
        MESSAGE_SPEECH_MAX_POLLS,
      ),
    ).toBe(false);
  });
});

describe('segment order', () => {
  it('plays the next index, waiting for a late one while the job runs', () => {
    const running = state(MessageSpeechJobStatus.GENERATING, [0, 2]);
    expect(nextSpeechSegmentIndex(running, 0)).toBe(1);
    expect(nextSpeechSegmentIndex(running, 3)).toBe(null);
  });

  it('skips a part a finished PARTIAL job never produced, and ends after the last', () => {
    const partial = state(MessageSpeechJobStatus.PARTIAL, [0, 2, 3]);
    expect(nextSpeechSegmentIndex(partial, 0)).toBe(2);
    expect(nextSpeechSegmentIndex(partial, 2)).toBe(3);
    expect(nextSpeechSegmentIndex(partial, 3)).toBe(null);
    expect(firstSpeechSegmentIndex(state(MessageSpeechJobStatus.PARTIAL, [1, 2]))).toBe(1);
    expect(firstSpeechSegmentIndex(state(MessageSpeechJobStatus.GENERATING, [1]))).toBe(0);
    expect(nextSpeechSegmentIndex(undefined, 0)).toBe(null);
  });
});

describe('deriveMessageSpeechPhase', () => {
  const base = {
    state: state(MessageSpeechJobStatus.GENERATING, []),
    currentIndex: 0,
    hasCurrentAudio: false,
    isPaused: false,
    isFinished: false,
    hasPlaybackError: false,
    isPollingExpired: false,
  };

  it.each([
    ['preparing before segment 1', {}, MessageSpeechPlaybackPhase.PREPARING],
    ['waiting for a later part', { currentIndex: 2 }, MessageSpeechPlaybackPhase.WAITING],
    ['playing', { hasCurrentAudio: true }, MessageSpeechPlaybackPhase.PLAYING],
    ['paused', { hasCurrentAudio: true, isPaused: true }, MessageSpeechPlaybackPhase.PAUSED],
    ['finished', { isFinished: true }, MessageSpeechPlaybackPhase.FINISHED],
    ['audio failed', { hasPlaybackError: true }, MessageSpeechPlaybackPhase.FAILED],
    ['poll cap reached', { isPollingExpired: true }, MessageSpeechPlaybackPhase.FAILED],
    [
      'job failed',
      { state: state(MessageSpeechJobStatus.FAILED, []) },
      MessageSpeechPlaybackPhase.FAILED,
    ],
  ])('%s', (_label, override, phase) => {
    expect(deriveMessageSpeechPhase({ ...base, ...override })).toBe(phase);
  });
});

describe('resolveSpeechPlayerErrorKey', () => {
  const base = {
    startError: null,
    state: undefined,
    isPollingExpired: false,
    hasPlaybackError: false,
  };

  it('prefers the start refusal, then the job code, then the cap, then playback', () => {
    expect(
      resolveSpeechPlayerErrorKey({ ...base, startError: apiError('PAYG_CREDIT_EXHAUSTED', 402) }),
    ).toBe('billing.errors.PAYG_CREDIT_EXHAUSTED');
    expect(
      resolveSpeechPlayerErrorKey({
        ...base,
        state: { ...state(MessageSpeechJobStatus.FAILED, []), errorCode: 'TTS_UNAVAILABLE' },
      }),
    ).toBe('chat.speech.errors.unavailable');
    expect(resolveSpeechPlayerErrorKey({ ...base, isPollingExpired: true })).toBe(
      'chat.speech.errors.timedOut',
    );
    expect(resolveSpeechPlayerErrorKey({ ...base, hasPlaybackError: true })).toBe(
      'chat.speech.errors.playback',
    );
    expect(
      resolveSpeechPlayerErrorKey({ ...base, state: state(MessageSpeechJobStatus.PARTIAL, [0]) }),
    ).toBe(null);
  });
});

describe('toMessageSpeechSnapshot', () => {
  it('reduces a mutation state to flags', () => {
    const boom = new Error('x');
    expect(
      toMessageSpeechSnapshot({ status: 'pending', data: undefined, error: null }),
    ).toMatchObject({ isPending: true, isSuccess: false, isError: false });
    expect(
      toMessageSpeechSnapshot({ status: 'error', data: undefined, error: boom }),
    ).toMatchObject({
      isError: true,
      error: boom,
    });
  });
});
