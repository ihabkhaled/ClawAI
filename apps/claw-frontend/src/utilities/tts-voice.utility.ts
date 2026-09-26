import { isSupportedTtsVoice } from '@claw/shared-constants';

import { TTS_VOICE_DEFAULT_VALUE } from '@/constants/tts-voice.constants';

/** The Select value for a saved voice: the name, or the default sentinel (none / retired voice). */
export function toTtsVoiceSelectValue(voice: string | null | undefined): string {
  return voice !== null && voice !== undefined && isSupportedTtsVoice(voice)
    ? voice
    : TTS_VOICE_DEFAULT_VALUE;
}

/** What the preferences API stores for a Select value: the voice, or null for the defaults. */
export function fromTtsVoiceSelectValue(value: string): string | null {
  return value === TTS_VOICE_DEFAULT_VALUE || !isSupportedTtsVoice(value) ? null : value;
}
