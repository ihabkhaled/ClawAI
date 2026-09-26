import { describe, expect, it } from 'vitest';

import {
  GEMINI_TTS_VOICES,
  isSupportedTtsVoice,
  OPENAI_TTS_VOICES,
  resolveTtsVoice,
  TTS_DEFAULT_VOICE_BY_PROVIDER,
  TTS_VOICE_MAX_LENGTH,
  TTS_VOICES_BY_PROVIDER,
  ttsVoiceProvider,
} from './tts-voice.constants';

describe('tts voice catalog', () => {
  it('names no voice twice, across providers', () => {
    const all = Object.values(TTS_VOICES_BY_PROVIDER).flat();
    expect(new Set(all).size).toBe(all.length);
  });

  it('keeps every name within the stored column bound', () => {
    for (const voice of Object.values(TTS_VOICES_BY_PROVIDER).flat()) {
      expect(voice.length).toBeLessThanOrEqual(TTS_VOICE_MAX_LENGTH);
    }
  });

  it('defaults each provider to one of its own voices', () => {
    for (const [provider, voice] of Object.entries(TTS_DEFAULT_VOICE_BY_PROVIDER)) {
      expect(TTS_VOICES_BY_PROVIDER[provider]).toContain(voice);
    }
  });

  it('knows which provider a voice belongs to', () => {
    expect(ttsVoiceProvider('Puck')).toBe('GEMINI');
    expect(ttsVoiceProvider('nova')).toBe('OPENAI');
    expect(ttsVoiceProvider('puck')).toBeNull();
    expect(isSupportedTtsVoice('Kore')).toBe(true);
    expect(isSupportedTtsVoice('robot')).toBe(false);
    expect(GEMINI_TTS_VOICES).toHaveLength(30);
    expect(OPENAI_TTS_VOICES).toHaveLength(6);
  });

  it("uses the user's voice for its own provider and the default for the other", () => {
    expect(resolveTtsVoice('GEMINI', 'Puck')).toBe('Puck');
    expect(resolveTtsVoice('OPENAI', 'Puck')).toBe('alloy');
    expect(resolveTtsVoice('openai', 'nova')).toBe('nova');
    expect(resolveTtsVoice('GEMINI', null)).toBe('Kore');
    expect(resolveTtsVoice('GROK', 'Puck')).toBeUndefined();
  });
});
