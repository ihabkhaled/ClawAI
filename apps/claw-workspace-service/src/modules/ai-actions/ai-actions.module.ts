import { Module } from '@nestjs/common';

import { AiActionController } from './controllers/ai-action.controller';
import { AiActionExecutionManager } from './managers/ai-action-execution.manager';
import { AutoRouterManager } from './managers/auto-router.manager';

@Module({
  controllers: [AiActionController],
  providers: [AutoRouterManager, AiActionExecutionManager],
  exports: [AutoRouterManager, AiActionExecutionManager],
})
export class AiActionsModule {}
