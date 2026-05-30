// Mirrors @claw/shared-entitlements PlanFeature — the union of plan-level
// feature gates that frontend code can check via useFeatureGates. Keep these
// keys in lock-step with the backend PlanFeatureGates type to avoid silent
// drift between frontend gating and backend enforcement.
export enum PlanFeature {
  ALLOW_COMPARE_MODE = 'allowCompareMode',
  ALLOW_JUDGE_MODE = 'allowJudgeMode',
  ALLOW_WORKSPACES = 'allowWorkspaces',
  ALLOW_MEMORY = 'allowMemory',
  ALLOW_CONTEXT_PACKS = 'allowContextPacks',
}
