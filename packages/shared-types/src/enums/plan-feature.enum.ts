// Orchestration features a plan can gate. Replaces the boolean-only
// Plan.allow* columns, which cannot express "one lifetime use" or "10 per month".
// The booleans remain as compatibility projections; PlanFeatureRule is
// authoritative.
export enum PlanFeature {
  COMPARE_MODE = 'COMPARE_MODE',
  JUDGE_MODE = 'JUDGE_MODE',
  RESEARCH_MODE = 'RESEARCH_MODE',
  WEB_SEARCH = 'WEB_SEARCH',
  WEB_FETCH = 'WEB_FETCH',
  WEB_EXTRACT = 'WEB_EXTRACT',
  CRITIC_REVIEW = 'CRITIC_REVIEW',
  WORKSPACES = 'WORKSPACES',
  MEMORY = 'MEMORY',
  CONTEXT_PACKS = 'CONTEXT_PACKS',
}
