import { PlanFeature } from '@/enums';

// Maps a plan feature gate to a localized feature-name i18n key. The
// UpgradeCtaBanner renders "Unlock {feature}" by interpolating the resolved
// label into chat.upgrade.title. Keep keys in sync with i18n.types.ts and
// every locale file.
export const PLAN_FEATURE_LABEL_KEYS: Record<PlanFeature, string> = {
  [PlanFeature.ALLOW_COMPARE_MODE]: 'chat.upgrade.features.compare',
  [PlanFeature.ALLOW_JUDGE_MODE]: 'chat.upgrade.features.judge',
  [PlanFeature.ALLOW_CRITIC_REVIEW]: 'chat.upgrade.features.critic',
  [PlanFeature.ALLOW_RESEARCH_MODE]: 'chat.upgrade.features.research',
  [PlanFeature.ALLOW_WORKSPACES]: 'chat.upgrade.features.workspaces',
  [PlanFeature.ALLOW_MEMORY]: 'chat.upgrade.features.memory',
  [PlanFeature.ALLOW_CONTEXT_PACKS]: 'chat.upgrade.features.contextPacks',
  [PlanFeature.ALLOW_CONSENSUS_MODE]: 'chat.upgrade.features.consensusMode',
  [PlanFeature.ALLOW_ESCALATION_CHAIN]: 'chat.upgrade.features.escalationChain',
  [PlanFeature.ALLOW_REPAIR_LAB]: 'chat.upgrade.features.repairLab',
  [PlanFeature.ALLOW_TASK_DECOMPOSER]: 'chat.upgrade.features.taskDecomposer',
  [PlanFeature.ALLOW_BEST_OF_N]: 'chat.upgrade.features.bestOfN',
  [PlanFeature.ALLOW_VERIFIER]: 'chat.upgrade.features.verifier',
  [PlanFeature.ALLOW_PIPELINE_LAB]: 'chat.upgrade.features.pipelineLab',
  [PlanFeature.ALLOW_COST_ENSEMBLE]: 'chat.upgrade.features.costEnsemble',
  [PlanFeature.ALLOW_ROLE_PACK]: 'chat.upgrade.features.rolePack',
};
