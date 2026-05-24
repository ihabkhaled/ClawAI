// SCAFFOLD: stream R.3 (04-r3-workflow-orchestrator) — handler stub
// HIGHEST priority — used for medical/legal/high-risk domains.
import { Injectable } from '@nestjs/common';
import { WorkflowKind } from '../../../../generated/prisma';
import type { IWorkflowHandler } from '../../types/workflow-handler.interface';
import type { WorkflowExecutionContext, WorkflowPlan } from '../../types/workflow-execution.types';

@Injectable()
export class JudgePipelineHandler implements IWorkflowHandler {
  readonly kind = WorkflowKind.JUDGE_PIPELINE;
  canHandle(_c: WorkflowExecutionContext): boolean {
    throw new Error('SCAFFOLD-R3 — JudgePipelineHandler.canHandle not implemented');
  }
  plan(_c: WorkflowExecutionContext): WorkflowPlan {
    throw new Error('SCAFFOLD-R3 — JudgePipelineHandler.plan not implemented');
  }
  confidence(_c: WorkflowExecutionContext): number { return 0; }
}
