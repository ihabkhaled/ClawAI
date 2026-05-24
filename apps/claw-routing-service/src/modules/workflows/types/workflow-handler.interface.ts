// SCAFFOLD: stream R.3 (04-r3-workflow-orchestrator)

import type { WorkflowKind } from '../../../generated/prisma';
import type { WorkflowExecutionContext, WorkflowPlan } from './workflow-execution.types';

export interface IWorkflowHandler {
  readonly kind: WorkflowKind;
  canHandle(context: WorkflowExecutionContext): boolean;
  plan(context: WorkflowExecutionContext): WorkflowPlan;
  confidence(context: WorkflowExecutionContext): number;
}
