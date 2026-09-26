import { describe, expect, it } from 'vitest';

import { TTS_VOICE_DEFAULT_VALUE } from '@/constants/tts-voice.constants';
import { fromTtsVoiceSelectValue, toTtsVoiceSelectValue } from '@/utilities/tts-voice.utility';

describe('tts voice select values', () => {
  it('shows a saved catalog voice, and the default for none or a retired voice', () => {
    expect(toTtsVoiceSelectValue('Puck')).toBe('Puck');
    expect(toTtsVoiceSelectValue(null)).toBe(TTS_VOICE_DEFAULT_VALUE);
    expect(toTtsVoiceSelectValue(undefined)).toBe(TTS_VOICE_DEFAULT_VALUE);
    expect(toTtsVoiceSelectValue('Retired')).toBe(TTS_VOICE_DEFAULT_VALUE);
  });

  it('saves null for the default choice and anything outside the catalog', () => {
    expect(fromTtsVoiceSelectValue(TTS_VOICE_DEFAULT_VALUE)).toBeNull();
    expect(fromTtsVoiceSelectValue('alloy')).toBe('alloy');
    expect(fromTtsVoiceSelectValue('robot')).toBeNull();
  });
});
