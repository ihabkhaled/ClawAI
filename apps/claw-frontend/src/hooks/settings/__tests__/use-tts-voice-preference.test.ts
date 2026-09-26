import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TTS_VOICE_DEFAULT_VALUE } from '@/constants/tts-voice.constants';
import { useTtsVoicePreference } from '@/hooks/settings/use-tts-voice-preference';

describe('useTtsVoicePreference', () => {
  it('exposes the saved voice as the Select value', () => {
    const { result } = renderHook(() => useTtsVoicePreference('Charon', vi.fn()));
    expect(result.current.currentTtsVoice).toBe('Charon');
  });

  it('saves a picked voice, and null for the default choice', () => {
    const updatePreferences = vi.fn();
    const { result } = renderHook(() => useTtsVoicePreference(null, updatePreferences));
    expect(result.current.currentTtsVoice).toBe(TTS_VOICE_DEFAULT_VALUE);

    result.current.handleTtsVoiceChange('echo');
    result.current.handleTtsVoiceChange(TTS_VOICE_DEFAULT_VALUE);

    expect(updatePreferences).toHaveBeenNthCalledWith(1, { ttsVoice: 'echo' });
    expect(updatePreferences).toHaveBeenNthCalledWith(2, { ttsVoice: null });
  });
});
