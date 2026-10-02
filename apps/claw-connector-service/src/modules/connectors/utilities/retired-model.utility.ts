import { OPENAI_RETIRED_MODEL_PATTERNS } from '../constants/openai.constants';

/** True when OpenAI lists the model but no longer serves it for chat (ADR-151). */
export function isRetiredOpenAiModel(modelKey: string): boolean {
  const key = modelKey.toLowerCase();
  return OPENAI_RETIRED_MODEL_PATTERNS.some((pattern) => pattern.test(key));
}
