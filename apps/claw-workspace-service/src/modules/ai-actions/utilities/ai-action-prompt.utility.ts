import type { AiActionKind } from '../../../common/enums/ai-action-kind.enum';
import {
  AI_ACTION_MAX_CONTEXT_CHARS,
  AI_ACTION_PROMPTS,
} from '../constants/ai-action-prompts.constants';
import type { BuiltAiActionPrompt } from '../types/ai-action.types';

export function buildAiActionPrompt(
  actionKind: AiActionKind,
  context: string,
  learnedPreferences: string[] = [],
): BuiltAiActionPrompt {
  const template =
    Object.entries(AI_ACTION_PROMPTS).find(([k]) => k === actionKind)?.[1] ??
    AI_ACTION_PROMPTS.SUMMARIZE;
  const trimmed =
    context.length > AI_ACTION_MAX_CONTEXT_CHARS
      ? `${context.slice(0, AI_ACTION_MAX_CONTEXT_CHARS)}\n\n[...truncated for length]`
      : context;
  const systemPrompt =
    learnedPreferences.length > 0
      ? `${template.system}\n\nKnown preferences for this user, learned from their past decisions — follow them unless they conflict with the instructions above:\n${learnedPreferences.map((p) => `- ${p}`).join('\n')}`
      : template.system;
  return {
    systemPrompt,
    userPrompt: `${template.userPrefix}${trimmed}`,
  };
}

export function combineSystemAndUser(systemPrompt: string, userPrompt: string): string {
  return `${systemPrompt}\n\n---\n\n${userPrompt}`;
}
