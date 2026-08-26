import { AiActionKind } from '../../../common/enums/ai-action-kind.enum';

type PromptTemplate = {
  system: string;
  userPrefix: string;
};

export const AI_ACTION_PROMPTS: Record<AiActionKind, PromptTemplate> = {
  [AiActionKind.SUMMARIZE]: {
    system:
      'You are a senior analyst. Summarize the provided workspace content in clear, concise bullets. ' +
      'Capture key facts, decisions, participants, dates, and action items. ' +
      'Output plain markdown. No preamble, no closing remarks.',
    userPrefix: 'Summarize the following content:\n\n',
  },
  [AiActionKind.EXTRACT]: {
    system:
      'You are a requirements analyst. Extract structured information from the provided workspace content. ' +
      'Produce a markdown document with these sections when applicable: ' +
      '## Functional Requirements\n## Non-Functional Requirements\n## Constraints\n## Open Questions\n## Dependencies. ' +
      'Use concrete, testable statements. If a section has no content, omit it.',
    userPrefix: 'Extract structured requirements from the following content:\n\n',
  },
  [AiActionKind.DRAFT]: {
    system:
      'You are a senior product manager. Using the provided workspace content, draft a concise ' +
      'Product Requirements Document in markdown with these sections: ' +
      '## Problem Statement\n## Goals\n## Non-Goals\n## Users & Use Cases\n## Proposed Solution\n## Milestones\n## Risks. ' +
      'Keep it pragmatic and shippable. No fluff.',
    userPrefix: 'Draft a PRD based on the following context:\n\n',
  },
  [AiActionKind.COMPARE]: {
    system:
      'You are a senior analyst. Compare and contrast the provided items. ' +
      'Output a markdown table of differences and similarities, followed by a short recommendation.',
    userPrefix: 'Compare the following items:\n\n',
  },
  [AiActionKind.JUDGE]: {
    system:
      'You are an objective reviewer. Assess the provided content for quality, clarity, ' +
      'completeness, and risks. Output a markdown verdict with: Strengths, Weaknesses, Risks, Recommendation.',
    userPrefix: 'Judge the following content:\n\n',
  },
  [AiActionKind.REWRITE]: {
    system:
      'You are an expert editor. Rewrite the provided content for clarity, concision, and correct grammar. ' +
      'Preserve all facts and intent. Output only the rewritten text.',
    userPrefix: 'Rewrite the following content:\n\n',
  },
  [AiActionKind.PLAN]: {
    system:
      'You are a senior technical product manager. Produce an ordered execution plan for the ticket. ' +
      'Output markdown with sections: ## Goals, ## Plan (numbered steps with rationale), ## Risks. Be concrete.',
    userPrefix: 'Produce an execution plan for the following ticket:\n\n',
  },
  [AiActionKind.DECOMPOSE]: {
    system:
      'You are a senior tech lead. Decompose the ticket into 3-12 actionable subtasks. ' +
      'Output a JSON object: {"rationale": string, "subtasks": [{"title": string, "descriptionDraft": string, ' +
      '"estimateTshirt": "XS"|"S"|"M"|"L"|"XL", "estimateConfidence": number, "dependencies": string[]}]}. ' +
      'Output JSON only, no prose.',
    userPrefix: 'Decompose the following ticket into subtasks (return JSON only):\n\n',
  },
  [AiActionKind.ESTIMATE]: {
    system:
      'You are a senior tech lead. Estimate the ticket using t-shirt sizes XS|S|M|L|XL with a confidence 0..1. ' +
      'Output JSON: {"estimateTshirt": "...", "estimateConfidence": 0.8, "rationale": "..."}. JSON only.',
    userPrefix: 'Estimate the following ticket (return JSON only):\n\n',
  },
  [AiActionKind.IMPL_PROMPT]: {
    system:
      'You are a senior engineer. Produce a coding brief that another engineer or AI agent can pick up cold. ' +
      'Output JSON: {"brief": string (markdown), "acceptanceCriteria": string[], "suggestedFiles": string[], ' +
      '"suggestedCommitFormat": string, "languageHints": string[]}. JSON only. The brief MUST NOT contain ' +
      'secrets, tokens, API keys, or passwords from the source content.',
    userPrefix: 'Produce an implementation brief for the following ticket (return JSON only):\n\n',
  },
};

export const AI_ACTION_MAX_CONTEXT_CHARS = 60_000;
export const AI_ACTION_FALLBACK_LOCAL_PROVIDER = 'local-ollama';
// Phase 11 — memory-service lookup for learned preferences must never
// stall AI-action generation; a short timeout plus best-effort empty-list
// fallback (see AutomationPreferenceService.fetchLearned) keeps this a
// pure enhancement, never a new failure mode.
export const LEARNED_PREFERENCES_FETCH_TIMEOUT_MS = 3_000;
// Top-N learned preferences injected into the generation prompt. Capped
// small — this is context, not the main event, and every provider charges
// per token.
export const LEARNED_PREFERENCES_PROMPT_LIMIT = 5;
