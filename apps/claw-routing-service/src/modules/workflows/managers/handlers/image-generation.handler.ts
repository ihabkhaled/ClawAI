// SCAFFOLD: stream R.3 (04-r3-workflow-orchestrator) — handler stub
// NOTE: Image generation is wired today in routing.manager.ts (Stage 2 of AUTO pipeline).
// This handler will replace that direct call when the workflow orchestrator goes live.
import { Injectable } from '@nestjs/common';
import { WorkflowKind } from '../../../../generated/prisma';
import type { IWorkflowHandler } from '../../types/workflow-handler.interface';
import type { WorkflowExecutionContext, WorkflowPlan } from '../../types/workflow-execution.types';

@Injectable()
export class ImageGenerationHandler implements IWorkflowHandler {
  readonly kind = WorkflowKind.IMAGE_GENERATION;
  canHandle(_c: WorkflowExecutionContext): boolean {
    throw new Error('SCAFFOLD-R3 — ImageGenerationHandler.canHandle not implemented; delegates to existing ImageDetectionManager');
  }
  plan(_c: WorkflowExecutionContext): WorkflowPlan {
    throw new Error('SCAFFOLD-R3 — ImageGenerationHandler.plan not implemented');
  }
  confidence(_c: WorkflowExecutionContext): number { return 0; }
}
