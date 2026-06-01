// Visible lifecycle status of an orchestration sub-stage emitted by the
// 9 orchestration managers (consensus, escalation-chain, repair, decompose,
// best-of-n, verifier, pipeline, cost-ensemble, role-pack). The FE rich-
// progress panel renders one badge per stage using these values.
export enum OrchestrationStageStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ERROR = 'error',
}
