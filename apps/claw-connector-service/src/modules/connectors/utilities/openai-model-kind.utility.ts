import { ModelKind } from '../../../generated/prisma';
import { OPENAI_RESPONSES_ONLY_PATTERNS } from '../constants/openai.constants';

/**
 * CHAT only when the model answers /v1/chat/completions. Responses-only models
 * (the *-pro family, *-codex, deep-research) are TOOL so a user can never pin
 * one that chat-service cannot call.
 */
export function classifyOpenAiModelKind(modelId: string): ModelKind {
  const lower = modelId.toLowerCase();
  return OPENAI_RESPONSES_ONLY_PATTERNS.some((pattern) => pattern.test(lower))
    ? ModelKind.TOOL
    : ModelKind.CHAT;
}

/** Why `classifyOpenAiModelKind` said TOOL, for the admin model list. Undefined for chat. */
export function openAiKindReason(modelId: string): string | undefined {
  return classifyOpenAiModelKind(modelId) === ModelKind.CHAT
    ? undefined
    : 'OpenAI serves this model on /v1/responses only (chat-service calls /v1/chat/completions)';
}
