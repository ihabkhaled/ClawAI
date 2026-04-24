import { Module } from '@nestjs/common';

import { AiActionController } from './controllers/ai-action.controller';
import { AutoRouterManager } from './managers/auto-router.manager';

@Module({
  controllers: [AiActionController],
  providers: [AutoRouterManager],
  exports: [AutoRouterManager],
})
export class AiActionsModule {}
