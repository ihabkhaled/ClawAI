import { describe, expect, it } from 'vitest';
import { BillingErrorCode } from '@claw/shared-types';
import { TranscriptionCreditRefusalCode } from '../../../../common/enums';
import {
  TRANSCRIPTION_CREDIT_CHECK_UNAVAILABLE_MESSAGE,
  TRANSCRIPTION_INSUFFICIENT_CREDIT_MESSAGE,
  TRANSCRIPTION_PAYG_MAX_AUDIO_SECONDS,
} from '../../constants/transcription-payg.constants';
import { MAX_TRANSCRIBABLE_AUDIO_BYTES } from '../../constants/transcription.constants';
import {
  estimateGeminiPromptTokens,
  estimateTranscriptOutputTokens,
  estimateWorstCaseAudioSeconds,
  isPerSecondPricedProvider,
  measuredAudioSeconds,
  measuredTokenUsage,
  transcriptionRefusal,
  transcriptionRefusalCode,
  transcriptionReleaseReason,
  transcriptionRequestId,
} from '../transcription-payg.utility';

describe('transcription PAYG utility', () => {
  it('keys a hold per file AND per provider', () => {
    expect(transcriptionRequestId('f1', 'GEMINI')).toBe('transcription:f1:GEMINI');
    expect(transcriptionRequestId('f1', 'OPENAI')).not.toBe(transcriptionRequestId('f1', 'GEMINI'));
  });

  it('keeps the first call bare and gives every later call to that provider its own id', () => {
    expect(transcriptionRequestId('f1', 'GEMINI', undefined, 1)).toBe('transcription:f1:GEMINI');
    expect(transcriptionRequestId('f1', 'GEMINI', undefined, 2)).toBe('transcription:f1:GEMINI:2');
    expect(transcriptionRequestId('v1', 'GEMINI', 'video-audio', 3)).toBe(
      'transcription:v1:video-audio:GEMINI:3',
    );
  });

  describe('estimateWorstCaseAudioSeconds', () => {
    it('divides bytes by the 1,000 B/s floor and rounds UP', () => {
      expect(estimateWorstCaseAudioSeconds(2_048)).toBe(3);
      expect(estimateWorstCaseAudioSeconds(60_000)).toBe(60);
    });

    it('never estimates below one second', () => {
      expect(estimateWorstCaseAudioSeconds(0)).toBe(1);
      expect(estimateWorstCaseAudioSeconds(-5)).toBe(1);
    });

    it('clamps to the auth wire maximum, which the 12 MB cap exceeds', () => {
      expect(estimateWorstCaseAudioSeconds(MAX_TRANSCRIBABLE_AUDIO_BYTES)).toBe(
        TRANSCRIPTION_PAYG_MAX_AUDIO_SECONDS,
      );
    });
  });

  it('sizes a Gemini hold at 32 audio tokens/s plus the instruction', () => {
    expect(estimateGeminiPromptTokens(10)).toBe(10 * 32 + 128);
    expect(estimateTranscriptOutputTokens(10)).toBe(10 * 8 + 1_024);
  });

  describe('measuredAudioSeconds', () => {
    it('rounds the measured duration up to a whole second', () => {
      expect(measuredAudioSeconds(1.2, 30)).toBe(2);
      expect(measuredAudioSeconds(4, 30)).toBe(4);
    });

    it('falls back to the reserved seconds when the duration is missing or unusable', () => {
      expect(measuredAudioSeconds(undefined, 30)).toBe(30);
      expect(measuredAudioSeconds(0, 30)).toBe(30);
      expect(measuredAudioSeconds(Number.NaN, 30)).toBe(30);
      expect(measuredAudioSeconds(-1, 30)).toBe(30);
    });

    it('clamps a measured duration to the wire maximum', () => {
      expect(measuredAudioSeconds(99_999, 30)).toBe(TRANSCRIPTION_PAYG_MAX_AUDIO_SECONDS);
    });
  });

  describe('measuredTokenUsage', () => {
    it('uses the reported usage when present', () => {
      const usage = {
        promptTokens: 5,
        completionTokens: 6,
        cachedPromptTokens: 1,
        reasoningTokens: 2,
      };
      expect(measuredTokenUsage({ text: 'abc', usage }, 999)).toBe(usage);
    });

    it('falls back to the reserved prompt and a character-derived completion, never zero', () => {
      expect(measuredTokenUsage({ text: 'abcdefghi' }, 224)).toEqual({
        promptTokens: 224,
        completionTokens: 3,
        cachedPromptTokens: 0,
        reasoningTokens: 0,
      });
    });
  });

  it('prices OpenAI per second and everything else per token', () => {
    expect(isPerSecondPricedProvider('OPENAI')).toBe(true);
    expect(isPerSecondPricedProvider('openai')).toBe(true);
    expect(isPerSecondPricedProvider('GEMINI')).toBe(false);
  });

  describe('refusal mapping', () => {
    it('tells a user with no credit to add credit', () => {
      expect(transcriptionRefusalCode(BillingErrorCode.PAYG_CREDIT_EXHAUSTED)).toBe(
        TranscriptionCreditRefusalCode.INSUFFICIENT_CREDIT,
      );
      expect(transcriptionRefusalCode(BillingErrorCode.PAYG_PROMPT_TOO_EXPENSIVE)).toBe(
        TranscriptionCreditRefusalCode.INSUFFICIENT_CREDIT,
      );
    });

    it('never blames the wallet for a check that could not run', () => {
      expect(transcriptionRefusalCode(BillingErrorCode.PAYG_PRICING_UNAVAILABLE)).toBe(
        TranscriptionCreditRefusalCode.CREDIT_CHECK_UNAVAILABLE,
      );
      expect(transcriptionRefusalCode(BillingErrorCode.PAYG_MODEL_UNPRICED)).toBe(
        TranscriptionCreditRefusalCode.CREDIT_CHECK_UNAVAILABLE,
      );
    });

    it('carries a readable message per code', () => {
      expect(transcriptionRefusal(TranscriptionCreditRefusalCode.INSUFFICIENT_CREDIT).reason).toBe(
        TRANSCRIPTION_INSUFFICIENT_CREDIT_MESSAGE,
      );
      expect(
        transcriptionRefusal(TranscriptionCreditRefusalCode.CREDIT_CHECK_UNAVAILABLE).reason,
      ).toBe(TRANSCRIPTION_CREDIT_CHECK_UNAVAILABLE_MESSAGE);
    });
  });

  it('reports a timeout release as TIMEOUT and anything else as PROVIDER_ERROR', () => {
    expect(transcriptionReleaseReason({ code: 'ECONNABORTED' })).toBe('TIMEOUT');
    expect(transcriptionReleaseReason({ code: 'ETIMEDOUT' })).toBe('TIMEOUT');
    expect(transcriptionReleaseReason(new Error('boom'))).toBe('PROVIDER_ERROR');
    expect(transcriptionReleaseReason(null)).toBe('PROVIDER_ERROR');
  });
});
