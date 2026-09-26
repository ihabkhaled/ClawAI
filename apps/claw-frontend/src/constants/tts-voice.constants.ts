import { GEMINI_TTS_VOICES, OPENAI_TTS_VOICES } from '@claw/shared-constants';

import type { TtsVoiceGroup } from '@/types/tts-voice.types';

/**
 * The "provider default" choice. Radix Select cannot hold an empty value, so
 * null (no saved voice) is this sentinel in the UI; no voice is named DEFAULT.
 */
export const TTS_VOICE_DEFAULT_VALUE = 'DEFAULT';

/** The read-aloud picker, one group per speech provider (catalog: @claw/shared-constants). */
export const TTS_VOICE_GROUPS: readonly TtsVoiceGroup[] = [
  { provider: 'GEMINI', labelKey: 'settings.ttsVoiceGroupGemini', voices: GEMINI_TTS_VOICES },
  { provider: 'OPENAI', labelKey: 'settings.ttsVoiceGroupOpenAi', voices: OPENAI_TTS_VOICES },
];

/** The id tying the card's visible label to the Select trigger (a11y). */
export const TTS_VOICE_SELECT_ID = 'settings-tts-voice';
