import { AiActionKind } from '../../../common/enums/ai-action-kind.enum';
import type { ModelChoice } from '../types/ai-action.types';

const LOCAL_FAST: ModelChoice = {
  provider: 'local-ollama',
  model: 'gemma3:4b',
  displayName: 'Gemma 3 4B (local)',
};
const LOCAL_REASONING: ModelChoice = {
  provider: 'local-ollama',
  model: 'phi4:14b',
  displayName: 'Phi 4 14B (local reasoning)',
};
const CLOUD_ANTHROPIC_SONNET: ModelChoice = {
  provider: 'ANTHROPIC',
  model: 'claude-sonnet-4-6',
  displayName: 'Claude Sonnet 4.6',
};
const CLOUD_OPENAI_MINI: ModelChoice = {
  provider: 'OPENAI',
  model: 'gpt-4o-mini',
  displayName: 'GPT-4o mini',
};
const CLOUD_GEMINI_FLASH: ModelChoice = {
  provider: 'GEMINI',
  model: 'gemini-2.5-flash',
  displayName: 'Gemini 2.5 Flash',
};

/**
 * Default AUTO primary + fallback chain per action kind.
 * Privacy class PRIVATE forces local-only (see AutoRouterManager).
 */
export const AI_ACTION_DEFAULT_ROUTES: Record<AiActionKind, ModelChoice[]> = {
  [AiActionKind.SUMMARIZE]: [LOCAL_FAST, CLOUD_GEMINI_FLASH, CLOUD_OPENAI_MINI],
  [AiActionKind.DRAFT]: [CLOUD_ANTHROPIC_SONNET, CLOUD_OPENAI_MINI, LOCAL_FAST],
  [AiActionKind.COMPARE]: [CLOUD_ANTHROPIC_SONNET, CLOUD_OPENAI_MINI, CLOUD_GEMINI_FLASH],
  [AiActionKind.JUDGE]: [CLOUD_ANTHROPIC_SONNET, LOCAL_REASONING, CLOUD_OPENAI_MINI],
  [AiActionKind.REWRITE]: [LOCAL_FAST, CLOUD_OPENAI_MINI, CLOUD_ANTHROPIC_SONNET],
  [AiActionKind.EXTRACT]: [CLOUD_GEMINI_FLASH, LOCAL_FAST, CLOUD_OPENAI_MINI],
};

export const LOCAL_FALLBACK_CHAIN: ModelChoice[] = [LOCAL_FAST, LOCAL_REASONING];
