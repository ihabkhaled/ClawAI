// Video generation providers (ADR-137). Each borrows the credentials of the chat
// connector of the same vendor, exactly like the IMAGE_* providers do.
export const VIDEO_PROVIDER_GEMINI = 'VIDEO_GEMINI';
export const VIDEO_PROVIDER_GROK = 'VIDEO_GROK';

/**
 * The chat connector whose credentials each video provider borrows. Anything
 * absent here is refused as unsupported: there is no local video provider, so
 * every video generation is paid and goes through the meter.
 *
 * OpenAI is deliberately absent: it shut the Sora 2 models and the Videos API
 * down on 2026-09-24 with no replacement.
 */
export const VIDEO_PROVIDER_CONNECTORS: ReadonlyMap<string, string> = new Map([
  [VIDEO_PROVIDER_GEMINI, 'GEMINI'],
  [VIDEO_PROVIDER_GROK, 'GROK'],
]);

// The cheapest model per provider that still gives a usable clip. Veo 3.1 Fast
// is $0.10 per second, Grok Imagine Video $0.05 (routing seed v11).
export const VIDEO_MODEL_GEMINI_AUTO = 'veo-3.1-fast-generate-preview';
export const VIDEO_MODEL_GROK_AUTO = 'grok-imagine-video';

/** The order AUTO tries providers in; a failure falls through to the next one. */
export const VIDEO_FALLBACK_CHAIN: ReadonlyArray<{ provider: string; model: string }> = [
  { provider: VIDEO_PROVIDER_GEMINI, model: VIDEO_MODEL_GEMINI_AUTO },
  { provider: VIDEO_PROVIDER_GROK, model: VIDEO_MODEL_GROK_AUTO },
];
