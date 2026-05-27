import { Module } from '@nestjs/common';
import { LiveWorkflowSelectorManager } from './managers/live-workflow-selector.manager';
import { WorkflowSelectorManager } from './managers/workflow-selector.manager';

@Module({
  providers: [WorkflowSelectorManager, LiveWorkflowSelectorManager],
  exports: [WorkflowSelectorManager, LiveWorkflowSelectorManager],
})
export class WorkflowsModule {}
