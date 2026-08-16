// Mirrors @claw/shared-entitlements PlanFeature — the union of plan-level
// feature gates that frontend code can check via useFeatureGates. Keep these
// keys in lock-step with the backend PlanFeatureGates type to avoid silent
// drift between frontend gating and backend enforcement.
export enum PlanFeature {
  ALLOW_COMPARE_MODE = 'allowCompareMode',
  ALLOW_JUDGE_MODE = 'allowJudgeMode',
  ALLOW_RESEARCH_MODE = 'allowResearchMode',
  ALLOW_CRITIC_REVIEW = 'allowCriticReview',
  ALLOW_WORKSPACES = 'allowWorkspaces',
  ALLOW_MEMORY = 'allowMemory',
  ALLOW_CONTEXT_PACKS = 'allowContextPacks',
  ALLOW_CONSENSUS_MODE = 'allowConsensusMode',
  ALLOW_ESCALATION_CHAIN = 'allowEscalationChain',
  ALLOW_REPAIR_LAB = 'allowRepairLab',
  ALLOW_TASK_DECOMPOSER = 'allowTaskDecomposer',
  ALLOW_BEST_OF_N = 'allowBestOfN',
  ALLOW_VERIFIER = 'allowVerifier',
  ALLOW_PIPELINE_LAB = 'allowPipelineLab',
  ALLOW_COST_ENSEMBLE = 'allowCostEnsemble',
  ALLOW_ROLE_PACK = 'allowRolePack',
}
