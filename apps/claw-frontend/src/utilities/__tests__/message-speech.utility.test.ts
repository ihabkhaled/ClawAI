import { SpeechUnavailableReason } from '@claw/shared-types';
import { describe, expect, it } from 'vitest';

import { MessageSpeechStatus } from '@/enums/message-speech-status.enum';
import { ApiClientError } from '@/services/shared/api-client';
import {
  buildSpeechDownloadPath,
  deriveMessageSpeechStatus,
  isSynthesizedSpeech,
  resolveMessageSpeechErrorKey,
  resolveSpeechUnavailableKey,
  toMessageSpeechSnapshot,
} from '@/utilities/message-speech.utility';

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
  const base = { isPending: false, isOpen: false, isSuccess: false, isError: false };

  it('is loading while a request is in flight, even before the flag settles', () => {
    expect(deriveMessageSpeechStatus({ ...base, isPending: true })).toBe(
      MessageSpeechStatus.LOADING,
    );
  });

  it('is playing only while the player is open over a successful request', () => {
    expect(deriveMessageSpeechStatus({ ...base, isOpen: true, isSuccess: true })).toBe(
      MessageSpeechStatus.PLAYING,
    );
    expect(deriveMessageSpeechStatus({ ...base, isSuccess: true })).toBe(MessageSpeechStatus.IDLE);
  });

  it('is an error only while the player is open over a failed request', () => {
    expect(deriveMessageSpeechStatus({ ...base, isOpen: true, isError: true })).toBe(
      MessageSpeechStatus.ERROR,
    );
    expect(deriveMessageSpeechStatus({ ...base, isError: true })).toBe(MessageSpeechStatus.IDLE);
  });
});

describe('isSynthesizedSpeech / toMessageSpeechSnapshot / buildSpeechDownloadPath', () => {
  it('accepts the synthesis response and rejects anything else', () => {
    expect(
      isSynthesizedSpeech({
        fileId: 'f1',
        mimeType: 'audio/wav',
        filename: 'reply.wav',
        truncated: false,
        characters: 10,
        cached: false,
      }),
    ).toBe(true);
    expect(isSynthesizedSpeech({ fileId: 'f1' })).toBe(false);
    expect(isSynthesizedSpeech(null)).toBe(false);
    expect(isSynthesizedSpeech('f1')).toBe(false);
  });

  it('reduces a mutation state to flags', () => {
    expect(toMessageSpeechSnapshot({ status: 'pending', data: undefined, error: null })).toEqual({
      isPending: true,
      isSuccess: false,
      isError: false,
      data: undefined,
      error: null,
    });
    const failure = new Error('x');
    expect(toMessageSpeechSnapshot({ status: 'error', data: undefined, error: failure })).toEqual({
      isPending: false,
      isSuccess: false,
      isError: true,
      data: undefined,
      error: failure,
    });
  });

  it('plays through the authenticated download path, never a public URL', () => {
    expect(buildSpeechDownloadPath('file-9')).toBe('/api/v1/files/download/file-9');
  });
});
