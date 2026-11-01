/**
 * Provider COST reference for audio generation, in integer micro-USD (rule 28: no
 * floats in billing). It is the table the routing cost seed (`model-cost-seed`)
 * copies a row from; image-service never prices a call itself. It reserves and
 * finalizes UNITS on `PaygSurface.TTS`, and auth-service multiplies them by the
 * seeded row and its markup, the same path image and video take.
 *
 * Verified 2026-10-31 against the vendors' price pages:
 *  - Gemini: https://ai.google.dev/gemini-api/docs/pricing (paid tier, Standard)
 *  - OpenAI gpt-4o-mini-tts: https://developers.openai.com/api/docs/models/gpt-4o-mini-tts
 *  - tts-1 / tts-1-hd: $15 / $30 per 1M characters, already seeded (routing v6)
 *
 * A model with no seeded row is refused at the hold with PAYG_MODEL_UNPRICED: it
 * fails closed, never free. `seeded` says which rows exist today.
 */
export type AudioPriceUnit = 'PER_MILLION_CHARACTERS' | 'PER_MILLION_TOKENS' | 'PER_SONG';

export type AudioPriceEntry = {
  model: string;
  unit: AudioPriceUnit;
  /** Input (text) side: micro-USD per 1M characters or tokens; per song for music. */
  inputMicroUsd: number;
  /** Output (audio tokens) side, micro-USD per 1M tokens; 0 where the unit has none. */
  outputMicroUsd: number;
  /** True when the routing seed already carries this row. */
  seeded: boolean;
};

export const AUDIO_PRICE_TABLE: readonly AudioPriceEntry[] = [
  {
    model: 'tts-1',
    unit: 'PER_MILLION_CHARACTERS',
    inputMicroUsd: 15_000_000,
    outputMicroUsd: 0,
    seeded: true,
  },
  {
    model: 'tts-1-hd',
    unit: 'PER_MILLION_CHARACTERS',
    inputMicroUsd: 30_000_000,
    outputMicroUsd: 0,
    seeded: true,
  },
  // $0.60 / 1M text tokens, $12.00 / 1M audio tokens. /audio/speech reports no usage, so
  // it cannot be settled on tokens: not seeded.
  {
    model: 'gpt-4o-mini-tts',
    unit: 'PER_MILLION_TOKENS',
    inputMicroUsd: 600_000,
    outputMicroUsd: 12_000_000,
    seeded: false,
  },
  {
    model: 'gemini-2.5-flash-preview-tts',
    unit: 'PER_MILLION_TOKENS',
    inputMicroUsd: 500_000,
    outputMicroUsd: 10_000_000,
    seeded: true,
  },
  {
    model: 'gemini-2.5-pro-preview-tts',
    unit: 'PER_MILLION_TOKENS',
    inputMicroUsd: 1_000_000,
    outputMicroUsd: 20_000_000,
    seeded: false,
  },
  {
    model: 'gemini-3.1-flash-tts-preview',
    unit: 'PER_MILLION_TOKENS',
    inputMicroUsd: 1_000_000,
    outputMicroUsd: 20_000_000,
    seeded: false,
  },
  // Music is priced per request. The meter has no per-song unit, so a song is metered as
  // one `imageUnits` item on the TTS surface once a row exists (see the service guide).
  {
    model: 'lyria-3-clip-preview',
    unit: 'PER_SONG',
    inputMicroUsd: 40_000,
    outputMicroUsd: 0,
    seeded: false,
  },
  {
    model: 'lyria-3-pro-preview',
    unit: 'PER_SONG',
    inputMicroUsd: 80_000,
    outputMicroUsd: 0,
    seeded: false,
  },
  { model: 'lyria-3.5', unit: 'PER_SONG', inputMicroUsd: 80_000, outputMicroUsd: 0, seeded: false },
];

/** OpenAI models metered per CHARACTER sent (`ttsPerCharacterMicroUsd`). */
export const AUDIO_PER_CHARACTER_MODELS: ReadonlySet<string> = new Set(['tts-1', 'tts-1-hd']);
