import { type OrchestrationStageStatus } from '../../../common/enums/orchestration-stage-status.enum';

// Payload published by ChatStreamService.emitOrchestrationStage(). Each
// orchestration manager (consensus / escalation-chain / repair / decompose /
// best-of-n / verifier / pipeline / cost-ensemble / role-pack) emits a
// sequence of these at obvious break points so the FE rich-progress panel
// can render a real stage-by-stage timeline instead of a spinner.
export type OrchestrationStagePayload = {
  // Short human label rendered as the stage's primary line.
  label: string;
  // Lifecycle status — drives the FE badge colour and the timeline state.
  status: OrchestrationStageStatus;
  // Optional secondary line (e.g. "Tier 2/3: anthropic/claude-3-haiku").
  detail?: string;
  // Stable identifier for the stage so repeat emits (active → completed)
  // upsert onto the same row in the FE timeline instead of stacking.
  // Recommended shape: "<manager>:<sub-stage>[:<index>]".
  stageId?: string;
};
