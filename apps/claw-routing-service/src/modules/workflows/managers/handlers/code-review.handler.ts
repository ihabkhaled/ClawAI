// SCAFFOLD: stream R.3 (04-r3-workflow-orchestrator) — handler stub
import { Injectable } from '@nestjs/common';
import { WorkflowKind } from '../../../../generated/prisma';
import type { IWorkflowHandler } from '../../types/workflow-handler.interface';
import type { WorkflowExecutionContext, WorkflowPlan } from '../../types/workflow-execution.types';

@Injectable()
export class CodeReviewHandler implements IWorkflowHandler {
  readonly kind = WorkflowKind.CODE_REVIEW;
  canHandle(_c: WorkflowExecutionContext): boolean {
    throw new Error('SCAFFOLD-R3 — CodeReviewHandler.canHandle not implemented');
  }
  plan(_c: WorkflowExecutionContext): WorkflowPlan {
    throw new Error('SCAFFOLD-R3 — CodeReviewHandler.plan not implemented');
  }
  confidence(_c: WorkflowExecutionContext): number { return 0; }
}
