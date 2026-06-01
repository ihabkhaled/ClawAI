import type { OrchestrationStage } from './orchestration.types';

// Return shape of useRolePackStages — exposes the live timeline rows
// the OrchestrationStageTimeline expects. The hook owns no other state
// and intentionally does NOT report errors here; the controller hook
// surfaces error UI from the polling result + the mutation error.
export type UseRolePackStagesResult = {
  stages: OrchestrationStage[];
};
