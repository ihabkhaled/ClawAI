import { type PaygHold } from '@claw/shared-entitlements';

import { AudioKind } from '../../../generated/prisma';
import { AUDIO_PER_CHARACTER_MODELS } from '../constants/audio-payg.constants';
import {
  AUDIO_UNIT_PRICED_OUTPUT_TOKENS,
  CHARACTERS_PER_TEXT_TOKEN,
  GEMINI_TTS_OUTPUT_TOKENS_PER_CHARACTER,
  GEMINI_TTS_PROMPT_OVERHEAD_TOKENS,
} from '../constants/audio-generation.constants';
import type {
  AudioMeterMode,
  AudioProviderUsage,
  AudioSettlement,
  ExecuteAudioInput,
} from '../types/audio-generation.types';
import { audioPriceKey } from './audio-wire.utility';

export function audioMeterMode(kind: AudioKind, provider: string, model: string): AudioMeterMode {
  if (kind === AudioKind.MUSIC) {
    return 'SONG';
  }
  // Only tts-1 and tts-1-hd have a per-character price. gpt-4o-mini-tts is priced per token
  // and /audio/speech reports no usage, so it settles on the hold's own estimate: the user is
  // never charged less than the work, and a model with no price for its unit is refused.
  return provider === 'AUDIO_OPENAI' && AUDIO_PER_CHARACTER_MODELS.has(audioPriceKey(model))
    ? 'CHARACTERS'
    : 'TOKENS';
}

/** The expected units the hold is sized on. Never zero: a zero hold prices $0. */
export function audioHoldUnits(input: ExecuteAudioInput): {
  promptTokens: number;
  requestedMaxOutputTokens: number;
  ttsCharacters?: number;
  imageUnits?: number;
} {
  const mode = audioMeterMode(input.kind, input.provider, input.model);
  if (mode === 'CHARACTERS') {
    return {
      promptTokens: 0,
      requestedMaxOutputTokens: AUDIO_UNIT_PRICED_OUTPUT_TOKENS,
      ttsCharacters: input.prompt.length,
    };
  }
  if (mode === 'SONG') {
    return {
      promptTokens: 0,
      requestedMaxOutputTokens: AUDIO_UNIT_PRICED_OUTPUT_TOKENS,
      imageUnits: 1,
    };
  }
  return {
    promptTokens:
      Math.ceil(input.prompt.length / CHARACTERS_PER_TEXT_TOKEN) +
      GEMINI_TTS_PROMPT_OVERHEAD_TOKENS,
    requestedMaxOutputTokens: input.prompt.length * GEMINI_TTS_OUTPUT_TOKENS_PER_CHARACTER,
  };
}

/**
 * What a paid hold settles on: characters sent (OpenAI), one song (Lyria), or the
 * tokens Gemini reported. A Gemini answer with no usage settles on the hold's own
 * estimate, which over-reserves, so the user is never charged less than the work.
 */
export function audioSettlement(
  hold: PaygHold,
  input: ExecuteAudioInput,
  usage: AudioProviderUsage | null,
  heldUnits: ReturnType<typeof audioHoldUnits>,
): AudioSettlement {
  const mode = audioMeterMode(input.kind, input.provider, input.model);
  const tokens = {
    promptTokens: mode === 'TOKENS' ? (usage?.promptTokens ?? heldUnits.promptTokens) : 0,
    completionTokens:
      mode === 'TOKENS' ? (usage?.completionTokens ?? heldUnits.requestedMaxOutputTokens) : 0,
    cachedPromptTokens: 0,
    reasoningTokens: 0,
  };
  return {
    hold,
    usage: tokens,
    calls: {
      toolCalls: 0,
      ...(mode === 'CHARACTERS' ? { ttsCharacters: input.prompt.length } : {}),
      ...(mode === 'SONG' ? { imageUnits: 1 } : {}),
    },
  };
}

/** A hold rebuilt from its stored reservation id, for releasing an attempt whose process died. */
export function abandonedAudioHold(reservationId: string): PaygHold {
  return {
    metered: true,
    maxOutputTokens: 0,
    clamped: false,
    reservationId,
    heldMicroUsd: 0,
    availableAfterMicroUsd: 0,
    reason: null,
  };
}
