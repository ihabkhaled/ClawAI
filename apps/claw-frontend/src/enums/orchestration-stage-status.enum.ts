// Status values surfaced on every row of the OrchestrationStageTimeline.
// The 9 orchestration lab pages (consensus, escalation, repair, decompose,
// best-of-n, verify, pipeline, cost-ensemble, role-pack) each translate
// their own per-mode progress events into this enum so the shared timeline
// component can render one consistent visual language across all pages.
//
// - PENDING: stage exists in the plan but has not started yet (greyed out).
// - ACTIVE: stage is currently running (animated primary dot + label).
// - DONE: stage finished successfully (emerald check).
// - FAILED: stage terminated in error (destructive cross).
export enum OrchestrationStageStatus {
  Pending = 'pending',
  Active = 'active',
  Done = 'done',
  Failed = 'failed',
}
