import { OrchestrationStageStatus } from '@/enums/orchestration-stage-status.enum';
import { VisibleProgressStageStatus } from '@/enums/visible-progress-stage-status.enum';

// Maps the chat-service SSE `VisibleProgressStageStatus` (which mirrors
// the backend `'active' | 'completed' | 'error' | 'queued'`) onto the FE
// `OrchestrationStageStatus` shared timeline enum.
//
// Both enums describe the same lifecycle but with different vocabulary:
//
//   SSE  (backend)        Orchestration  (timeline)
//   ─────────────────     ─────────────────────────
//   QUEUED               → Pending
//   ACTIVE               → Active
//   COMPLETED            → Done
//   ERROR                → Failed
//
// Centralised here so the 9 orchestration lab pages do not each define
// their own near-identical mapping inline (which would also violate the
// no-inline-utility ESLint rule on hook files).
export function mapVisibleStatusToOrchestrationStatus(
  status: VisibleProgressStageStatus | undefined,
): OrchestrationStageStatus {
  if (status === VisibleProgressStageStatus.COMPLETED) {
    return OrchestrationStageStatus.Done;
  }
  if (status === VisibleProgressStageStatus.ERROR) {
    return OrchestrationStageStatus.Failed;
  }
  if (status === VisibleProgressStageStatus.QUEUED) {
    return OrchestrationStageStatus.Pending;
  }
  return OrchestrationStageStatus.Active;
}
