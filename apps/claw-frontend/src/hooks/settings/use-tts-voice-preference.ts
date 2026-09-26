'use client';

import type { TtsVoicePreferenceState, UpdatePreferencesRequest } from '@/types';
import { logger } from '@/utilities';
import { fromTtsVoiceSelectValue, toTtsVoiceSelectValue } from '@/utilities/tts-voice.utility';

/**
 * The read-aloud voice picker's state: the saved voice as a Select value, and
 * the change handler that saves it (null = each provider's default voice).
 */
export function useTtsVoicePreference(
  savedVoice: string | null | undefined,
  updatePreferences: (data: UpdatePreferencesRequest) => void,
): TtsVoicePreferenceState {
  function handleTtsVoiceChange(value: string): void {
    const ttsVoice = fromTtsVoiceSelectValue(value);
    logger.info({
      component: 'settings',
      action: 'change-tts-voice',
      message: 'User changing read-aloud voice',
      details: { ttsVoice },
    });
    updatePreferences({ ttsVoice });
  }

  return { currentTtsVoice: toTtsVoiceSelectValue(savedVoice), handleTtsVoiceChange };
}
