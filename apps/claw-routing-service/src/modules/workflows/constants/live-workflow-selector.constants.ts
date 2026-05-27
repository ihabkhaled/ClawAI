// Live workflow selector constants — Phase 6.
//
// Only DIRECT_LLM and SEARCH_FIRST are LIVE today. Every other
// WorkflowKind from the Prisma enum is surfaced honestly as
// `available: false, reason: NOT_LIVE` so the UI can render an
// "unavailable" badge instead of pretending the option works.

import { WorkflowKind } from '../../../generated/prisma';

// "Fresh information" markers that strongly indicate the user wants
// up-to-the-minute info the model cannot have in its weights. These
// run through the existing matchKeyword utility (whole-word + plural
// tolerant), NOT plain `.includes()` — substring matches misfire on
// benign prompts (e.g. "today" inside "todays-newsletter").
export const SEARCH_FIRST_TRIGGER_KEYWORDS = [
  'today',
  'tonight',
  'latest',
  'current',
  'currently',
  'breaking',
  'now',
  'this week',
  'this month',
  'this year',
  'right now',
  'as of',
  'in 2026',
  'in 2027',
  'recently',
  'most recent',
  'newest',
  'just announced',
  'just released',
  'live',
  'real-time',
  'realtime',
  // Markers like "news today" / "stock price today" routinely need search.
  // "news" alone is intentionally NOT here to avoid false positives like
  // "news article about classical music"; the trigger words above are
  // strong enough on their own and SemanticIntent.requiresSearch covers
  // the rest.
] as const;

// LIVE_WORKFLOWS is the closed set of workflow kinds that have a real
// executor wired through chat-service. Everything outside this set
// must show up in `alternatives` as `available: false`.
export const LIVE_WORKFLOWS: readonly WorkflowKind[] = [
  WorkflowKind.DIRECT_LLM,
  WorkflowKind.SEARCH_FIRST,
] as const;

export const WORKFLOW_REASON_SEMANTIC_INTENT_REQUIRES_SEARCH =
  'semantic_intent_requires_search';
export const WORKFLOW_REASON_KEYWORD_FRESH_INFO_MARKER = 'fresh_info_marker_matched';
export const WORKFLOW_REASON_DEFAULT_DIRECT = 'default_direct';
export const WORKFLOW_REASON_NOT_LIVE = 'NOT_LIVE';
