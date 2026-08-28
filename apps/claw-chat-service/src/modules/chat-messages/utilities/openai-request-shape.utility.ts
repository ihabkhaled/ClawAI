import { OPENAI_REASONING_MODEL_PREFIXES } from '../constants/openai-request-shape.constants';

function isOpenAiReasoningModel(model: string): boolean {
  const normalized = model.trim().toLowerCase();
  return OPENAI_REASONING_MODEL_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

// These models renamed the output cap; sending the old field is a 400, not a
// silently ignored parameter.
export function modelRequiresMaxCompletionTokens(model: string): boolean {
  return isOpenAiReasoningModel(model);
}

// These models accept only the default temperature. Treated as "rejects
// sampling" rather than "clamp to 1", because sending the default explicitly
// buys nothing and one more field is one more thing to get wrong.
export function modelRejectsCustomTemperature(model: string): boolean {
  return isOpenAiReasoningModel(model);
}
