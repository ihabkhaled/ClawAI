/**
 * How to recognise an audio-OUTPUT model (text-to-speech, music, native audio)
 * offered under an ordinary chat connector.
 *
 * The connector catalog has no AUDIO-output kind, so `gemini-2.5-flash-preview-tts`,
 * `gpt-4o-mini-tts` and `gemini-2.5-flash-native-audio` were listed as ordinary
 * CHAT models and picking one ran `/chat/completions`, which none of them serve.
 *
 * The patterns are connector-independent on purpose (providers are data): the
 * token `tts`, `text-to-speech`, `native-audio`, `lyria` or `music` between
 * separators marks the family, so a future id of the same shape is caught
 * without a code change. Input-side audio models (whisper, transcribe) are
 * deliberately NOT matched: they read audio, they do not produce it.
 */
export const AUDIO_MUSIC_MODEL_PATTERN: RegExp =
  /(?:^|[/_.:-])(?:lyria|music|musicgen)(?:[_.:-]|$)/iu;

export const AUDIO_SPEECH_MODEL_PATTERN: RegExp =
  /(?:^|[/_.:-])(?:tts|text-to-speech|native-audio|speech)(?:[_.:-]|$)/iu;

export type AudioOutputKind = 'SPEECH' | 'MUSIC';
