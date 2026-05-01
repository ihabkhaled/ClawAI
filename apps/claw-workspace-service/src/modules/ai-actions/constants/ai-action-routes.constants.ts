import { AiActionKind } from '../../../common/enums/ai-action-kind.enum';

// Capability hints per action kind. The resolver scores installed local models
// and connected cloud models against these hints to pick the best concrete
// primary + fallback chain at runtime — no static model names baked in.
export const AI_ACTION_CAPABILITY_HINTS: Record<AiActionKind, string[]> = {
  [AiActionKind.SUMMARIZE]: ['structured_output', 'long_context', 'general'],
  [AiActionKind.DRAFT]: ['creative_writing', 'instruction_following', 'general'],
  [AiActionKind.COMPARE]: ['reasoning', 'structured_reasoning', 'analysis'],
  [AiActionKind.JUDGE]: ['reasoning', 'structured_reasoning', 'analysis'],
  [AiActionKind.REWRITE]: ['creative_writing', 'instruction_following'],
  [AiActionKind.EXTRACT]: ['structured_output', 'json', 'extraction'],
  // Stream 41 — ticket planning + coding bridge
  [AiActionKind.PLAN]: ['thinking', 'reasoning', 'planning', 'long_context'],
  [AiActionKind.DECOMPOSE]: ['reasoning', 'structured_output', 'json', 'planning'],
  [AiActionKind.ESTIMATE]: ['reasoning', 'structured_output', 'json'],
  [AiActionKind.IMPL_PROMPT]: ['coding', 'reasoning', 'structured_output', 'long_context'],
};

// True when an action kind should prefer a local model when one is installed,
// even if cloud connectors are healthy. Privacy-sensitive action kinds are
// always evaluated under privacy-first rules; this map is for non-privacy
// preference shaping.
export const AI_ACTION_PREFERS_LOCAL: Record<AiActionKind, boolean> = {
  [AiActionKind.SUMMARIZE]: true,
  [AiActionKind.DRAFT]: false,
  [AiActionKind.COMPARE]: false,
  [AiActionKind.JUDGE]: false,
  [AiActionKind.REWRITE]: true,
  [AiActionKind.EXTRACT]: true,
  // Stream 41
  [AiActionKind.PLAN]: false,
  [AiActionKind.DECOMPOSE]: false,
  [AiActionKind.ESTIMATE]: true,
  [AiActionKind.IMPL_PROMPT]: false,
};
