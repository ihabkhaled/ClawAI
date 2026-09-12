/**
 * Tokens in a model id that are acronyms, not words.
 *
 * Mechanical title-casing renders these as "Tts", "Gpt", "Ai" — which reads as
 * a typo on a page whose whole job is to look authoritative about AI models.
 * Kept as an uppercase Set so the lookup is a single normalised comparison.
 */
export const MODEL_DISPLAY_NAME_ACRONYMS: ReadonlySet<string> = new Set([
  'AI',
  'API',
  'GPT',
  'GLM',
  'TTS',
  'STT',
  'ASR',
  'OCR',
  'LLM',
  'VL',
  'IT',
  'XL',
  'XS',
  'HD',
  'SD',
  'MOE',
  'RAG',
]);
