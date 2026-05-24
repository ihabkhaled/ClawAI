// SCAFFOLD: stream R.3 (04-r3-workflow-orchestrator)
// Top-level coordinator — picks the right workflow handler based on context.
// NOT yet wired into RoutingManager.handleAuto().

import { Injectable, Logger } from '@nestjs/common';

import type { WorkflowChoice, WorkflowExecutionContext } from '../types/workflow-execution.types';

@Injectable()
export class WorkflowOrchestratorManager {
  private readonly logger = new Logger(WorkflowOrchestratorManager.name);

  pickWorkflow(_context: WorkflowExecutionContext): WorkflowChoice {
    this.logger.warn('WorkflowOrchestratorManager.pickWorkflow: SCAFFOLD only');
    throw new Error(
      'SCAFFOLD-R3 — WorkflowOrchestratorManager.pickWorkflow not implemented; see docs/15-ai-context/routing-flagship-streams/04-r3-workflow-orchestrator.md',
    );
  }
}
