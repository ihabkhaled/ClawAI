import {
  OPENAI_CHAT_MODEL_INCLUDE_PATTERN,
  OPENAI_NON_CHAT_MODEL_PATTERN,
} from '../constants/openai.constants';

/** True when a listed OpenAI id may be a chat model: a gpt/o-series id outside the non-chat families. */
export function isOpenAiChatModelId(modelId: string): boolean {
  const lower = modelId.toLowerCase();
  return (
    OPENAI_CHAT_MODEL_INCLUDE_PATTERN.test(lower) && !OPENAI_NON_CHAT_MODEL_PATTERN.test(lower)
  );
}
