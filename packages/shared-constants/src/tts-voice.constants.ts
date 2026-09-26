// ---- Read-aloud voices (text-to-speech, ADR-120 addendum "voice picker") ----
//
// The voices a user may pick for "Read aloud", per speech provider. Keys are
// the connector provider names chat-service speaks through (GEMINI, OPENAI).
// Voice names are proper nouns and exactly what each provider's API expects —
// never translated, never re-cased.
//
// auth-service validates `User.ttsVoice` against this list, chat-service uses
// it to decide whether the saved voice belongs to the provider actually
// reading (else that provider's default), and the frontend renders the picker
// from it. One list, three services — it lives here, not in any of them.

// Gemini TTS prebuilt voices, as listed in the Gemini API speech-generation
// docs (verified 2026-09-26).
export const GEMINI_TTS_VOICES: readonly string[] = [
  'Zephyr',
  'Puck',
  'Charon',
  'Kore',
  'Fenrir',
  'Leda',
  'Orus',
  'Aoede',
  'Callirrhoe',
  'Autonoe',
  'Enceladus',
  'Iapetus',
  'Umbriel',
  'Algieba',
  'Despina',
  'Erinome',
  'Algenib',
  'Rasalgethi',
  'Laomedeia',
  'Achernar',
  'Alnilam',
  'Schedar',
  'Gacrux',
  'Pulcherrima',
  'Achird',
  'Zubenelgenubi',
  'Vindemiatrix',
  'Sadachbia',
  'Sadaltager',
  'Sulafat',
];

// OpenAI tts-1 / tts-1-hd voices (the models chat-service meters per character).
export const OPENAI_TTS_VOICES: readonly string[] = [
  'alloy',
  'echo',
  'fable',
  'onyx',
  'nova',
  'shimmer',
];

export const TTS_VOICES_BY_PROVIDER: Readonly<Record<string, readonly string[]>> = {
  GEMINI: GEMINI_TTS_VOICES,
  OPENAI: OPENAI_TTS_VOICES,
};

// The voice each provider speaks with when the user has not picked one of ITS
// voices (no preference, or a voice of the other provider).
export const TTS_DEFAULT_VOICE_BY_PROVIDER: Readonly<Record<string, string>> = {
  GEMINI: 'Kore',
  OPENAI: 'alloy',
};

// Longest voice name above; the column and the DTO are bounded by it.
export const TTS_VOICE_MAX_LENGTH = 32;

// The provider a voice belongs to, or null for a name no provider offers.
export function ttsVoiceProvider(voice: string): string | null {
  for (const [provider, voices] of Object.entries(TTS_VOICES_BY_PROVIDER)) {
    if (voices.includes(voice)) {
      return provider;
    }
  }
  return null;
}

export function isSupportedTtsVoice(voice: string): boolean {
  return ttsVoiceProvider(voice) !== null;
}

// The voice `provider` should read with: the user's own when it is one of
// that provider's voices, else the provider's default. Undefined only for a
// provider with no voice catalog.
export function resolveTtsVoice(provider: string, preferred: string | null): string | undefined {
  const voices = TTS_VOICES_BY_PROVIDER[provider.toUpperCase()];
  if (voices === undefined) {
    return undefined;
  }
  return preferred !== null && voices.includes(preferred)
    ? preferred
    : TTS_DEFAULT_VOICE_BY_PROVIDER[provider.toUpperCase()];
}
