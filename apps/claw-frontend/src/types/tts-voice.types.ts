/** One provider's voices in the read-aloud picker. Voice names are proper nouns, shown as-is. */
export type TtsVoiceGroup = {
  provider: string;
  /** i18n key of the group heading ("Gemini voices"). */
  labelKey: string;
  voices: readonly string[];
};

export type TtsVoicePreferenceCardProps = {
  /** The Select value: a voice name, or `TTS_VOICE_DEFAULT_VALUE`. */
  value: string;
  isPending: boolean;
  onChange: (value: string) => void;
};

export type TtsVoicePreferenceState = {
  currentTtsVoice: string;
  handleTtsVoiceChange: (value: string) => void;
};
