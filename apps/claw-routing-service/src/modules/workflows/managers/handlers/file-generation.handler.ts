// SCAFFOLD: stream R.3 (04-r3-workflow-orchestrator) — handler stub
// NOTE: File generation is wired today in routing.manager.ts (Stage 3 of AUTO pipeline).
// This handler will replace that direct call when the workflow orchestrator goes live.
import { Injectable } from '@nestjs/common';
import { WorkflowKind } from '../../../../generated/prisma';
import type { IWorkflowHandler } from '../../types/workflow-handler.interface';
import type { WorkflowExecutionContext, WorkflowPlan } from '../../types/workflow-execution.types';

@Injectable()
export class FileGenerationHandler implements IWorkflowHandler {
  readonly kind = WorkflowKind.FILE_GENERATION;
  canHandle(_c: WorkflowExecutionContext): boolean {
    throw new Error('SCAFFOLD-R3 — FileGenerationHandler.canHandle not implemented; delegates to existing file-gen detection');
  }
  plan(_c: WorkflowExecutionContext): WorkflowPlan {
    throw new Error('SCAFFOLD-R3 — FileGenerationHandler.plan not implemented');
  }
  confidence(_c: WorkflowExecutionContext): number { return 0; }
}
