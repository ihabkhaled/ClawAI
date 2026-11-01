// Audio generation providers (speech and music). Each borrows the credentials of the
// chat connector of the same vendor, exactly like the IMAGE_* and VIDEO_* providers.
export const AUDIO_PROVIDER_OPENAI = 'AUDIO_OPENAI';
export const AUDIO_PROVIDER_GEMINI = 'AUDIO_GEMINI';

/**
 * The chat connector whose credentials each audio provider borrows. Anything absent
 * here is refused as unsupported. There is no local audio provider, so every audio
 * generation is paid and goes through the meter.
 *
 * xAI is deliberately absent: its docs list text to speech at $15 per 1M characters
 * but publish no model id or request shape this service could verify.
 */
export const AUDIO_PROVIDER_CONNECTORS: ReadonlyMap<string, string> = new Map([
  [AUDIO_PROVIDER_OPENAI, 'OPENAI'],
  [AUDIO_PROVIDER_GEMINI, 'GEMINI'],
]);

export const AUDIO_KIND_SPEECH = 'SPEECH';
export const AUDIO_KIND_MUSIC = 'MUSIC';

/** The model used when the caller names none. Each speech one has a routing price row. */
export const AUDIO_DEFAULT_MODELS: ReadonlyMap<string, string> = new Map([
  [`${AUDIO_KIND_SPEECH}:${AUDIO_PROVIDER_OPENAI}`, 'tts-1'],
  [`${AUDIO_KIND_SPEECH}:${AUDIO_PROVIDER_GEMINI}`, 'gemini-2.5-flash-preview-tts'],
  [`${AUDIO_KIND_MUSIC}:${AUDIO_PROVIDER_GEMINI}`, 'lyria-3-clip-preview'],
]);
