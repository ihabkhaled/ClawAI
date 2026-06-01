import { OrchestrationStageStatus } from '@/enums/orchestration-stage-status.enum';
import { VisibleProgressStageStatus } from '@/enums/visible-progress-stage-status.enum';
import type { VisibleProgressStage } from '@/types/chat.types';
import type { OrchestrationStage } from '@/types/orchestration.types';

// Map a single VisibleProgressStageStatus (emitted by the chat-service SSE
// channel) onto the four-state OrchestrationStageStatus that the shared
// <OrchestrationStageTimeline /> renders. Pipeline's backend
// `emitOrchestrationStage` lifts orchestration stages onto the existing
// RESPONSE_STREAMING event type and carries QUEUED / ACTIVE / COMPLETED /
// ERROR statuses — the mapper preserves intent without losing fidelity.
function mapStatus(status: VisibleProgressStageStatus): OrchestrationStageStatus {
  if (status === VisibleProgressStageStatus.COMPLETED) {
    return OrchestrationStageStatus.Done;
  }
  if (status === VisibleProgressStageStatus.ERROR) {
    return OrchestrationStageStatus.Failed;
  }
  if (status === VisibleProgressStageStatus.ACTIVE) {
    return OrchestrationStageStatus.Active;
  }
  return OrchestrationStageStatus.Pending;
}

// Map a VisibleProgressStage produced by `useChatStream` into the
// OrchestrationStage shape consumed by the shared timeline component.
// Pipeline-only callers can use this directly; future orchestration
// pages can share the same mapper since the source shape is generic.
export function mapVisibleProgressStageToOrchestrationStage(
  stage: VisibleProgressStage,
): OrchestrationStage {
  const orchestrationStage: OrchestrationStage = {
    id: stage.id,
    label: stage.label,
    status: mapStatus(stage.status),
  };
  if (stage.description !== undefined && stage.description !== '') {
    orchestrationStage.detail = stage.description;
  }
  if (stage.actorName !== undefined && stage.actorName !== '') {
    orchestrationStage.actorName = stage.actorName;
  }
  return orchestrationStage;
}

// Map the full progress array. Stable identity per stage id keeps React
// keys flicker-free across re-renders.
export function mapVisibleProgressStagesToOrchestrationStages(
  stages: VisibleProgressStage[],
): OrchestrationStage[] {
  return stages.map((stage) => mapVisibleProgressStageToOrchestrationStage(stage));
}
