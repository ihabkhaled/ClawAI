import { Module } from '@nestjs/common';
import { WorkflowSelectorManager } from './managers/workflow-selector.manager';

@Module({
  providers: [WorkflowSelectorManager],
  exports: [WorkflowSelectorManager],
})
export class WorkflowsModule {}
