import {
  DECOMPOSE_STAGE_ID_EXECUTE,
  DECOMPOSE_STAGE_ID_PLAN,
  DECOMPOSE_STAGE_ID_RESULT,
  DECOMPOSE_STAGE_ID_SUBMIT,
} from '@/constants/decompose.constants';
import { OrchestrationStageStatus } from '@/enums/orchestration-stage-status.enum';
import type { TranslateFunction } from '@/types/i18n.types';
import type { OrchestrationStage } from '@/types/orchestration.types';

// Inputs that drive the synthetic stage timeline on the Decompose lab.
// All four flags come from the controller hook (`useDecomposePage`), so
// the stages are a pure function of hook state. When backend grows real
// `orchestration_stage` SSE events, this utility becomes the place to
// merge SSE-driven status into the locally synthesised timeline.
export type DecomposeStageInputs = {
  hasSubmitted: boolean;
  hasThreadId: boolean;
  isPolling: boolean;
  isReady: boolean;
  isError: boolean;
};

// Build a stable, ordered list of OrchestrationStage rows for the
// decompose timeline. The output is deterministic for any inputs object,
// so React keys stay stable across renders and the timeline does not
// flicker as the run progresses.
//
// State transitions:
//   ┌────────────────────────────────────────────────────────────────┐
//   │ submit  → "Submitting task"                                    │
//   │   - active  while !threadId (request in flight)                │
//   │   - done    once threadId arrives                              │
//   │   - failed  if isError                                         │
//   ├────────────────────────────────────────────────────────────────┤
//   │ plan    → "Planning sub-tasks"                                 │
//   │   - active  threadId && isPolling && !ready                    │
//   │   - done    once ready OR once execute moved past it           │
//   │   - failed  if isError                                         │
//   ├────────────────────────────────────────────────────────────────┤
//   │ execute → "Executing sub-tasks"                                │
//   │   - active  threadId && isPolling && !ready                    │
//   │     (rendered after plan but shows ACTIVE while polling so     │
//   │      users see sub-task work happening)                        │
//   │   - done    once ready                                         │
//   │   - failed  if isError                                         │
//   ├────────────────────────────────────────────────────────────────┤
//   │ result  → "Synthesizing answer"                                │
//   │   - active  threadId && isPolling && !ready (last leg)         │
//   │   - done    once ready                                         │
//   │   - failed  if isError                                         │
//   └────────────────────────────────────────────────────────────────┘
export function buildDecomposeStages(
  inputs: DecomposeStageInputs,
  t: TranslateFunction,
): OrchestrationStage[] {
  if (!inputs.hasSubmitted) {
    return [];
  }

  const submitStatus = resolveSubmitStatus(inputs);
  const planStatus = resolvePlanStatus(inputs);
  const executeStatus = resolveExecuteStatus(inputs);
  const resultStatus = resolveResultStatus(inputs);

  return [
    {
      id: DECOMPOSE_STAGE_ID_SUBMIT,
      label: t('decompose.stages.submit'),
      status: submitStatus,
    },
    {
      id: DECOMPOSE_STAGE_ID_PLAN,
      label: t('decompose.stages.plan'),
      status: planStatus,
    },
    {
      id: DECOMPOSE_STAGE_ID_EXECUTE,
      label: t('decompose.stages.execute'),
      status: executeStatus,
    },
    {
      id: DECOMPOSE_STAGE_ID_RESULT,
      label: t('decompose.stages.result'),
      status: resultStatus,
    },
  ];
}

function resolveSubmitStatus(inputs: DecomposeStageInputs): OrchestrationStageStatus {
  if (inputs.isError && !inputs.hasThreadId) {
    return OrchestrationStageStatus.Failed;
  }
  if (inputs.hasThreadId) {
    return OrchestrationStageStatus.Done;
  }
  return OrchestrationStageStatus.Active;
}

function resolvePlanStatus(inputs: DecomposeStageInputs): OrchestrationStageStatus {
  if (!inputs.hasThreadId) {
    return OrchestrationStageStatus.Pending;
  }
  if (inputs.isError) {
    return OrchestrationStageStatus.Failed;
  }
  if (inputs.isReady) {
    return OrchestrationStageStatus.Done;
  }
  return OrchestrationStageStatus.Active;
}

function resolveExecuteStatus(inputs: DecomposeStageInputs): OrchestrationStageStatus {
  if (!inputs.hasThreadId) {
    return OrchestrationStageStatus.Pending;
  }
  if (inputs.isError) {
    return OrchestrationStageStatus.Failed;
  }
  if (inputs.isReady) {
    return OrchestrationStageStatus.Done;
  }
  if (inputs.isPolling) {
    return OrchestrationStageStatus.Active;
  }
  return OrchestrationStageStatus.Pending;
}

function resolveResultStatus(inputs: DecomposeStageInputs): OrchestrationStageStatus {
  if (inputs.isReady) {
    return OrchestrationStageStatus.Done;
  }
  if (inputs.isError) {
    return OrchestrationStageStatus.Failed;
  }
  if (inputs.isPolling) {
    return OrchestrationStageStatus.Active;
  }
  return OrchestrationStageStatus.Pending;
}
