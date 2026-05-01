import { Module } from '@nestjs/common';

import { AiActionsModule } from '../ai-actions/ai-actions.module';

import { DecomposeFanoutController } from './controllers/decompose-fanout.controller';
import { ImplHandoffController } from './controllers/impl-handoff.controller';
import { DecomposeFanoutManager } from './managers/decompose-fanout.manager';
import { ImplHandoffManager } from './managers/impl-handoff.manager';
import { ImplHandoffRepository } from './repositories/impl-handoff.repository';

@Module({
  imports: [AiActionsModule],
  controllers: [ImplHandoffController, DecomposeFanoutController],
  providers: [ImplHandoffRepository, ImplHandoffManager, DecomposeFanoutManager],
  exports: [ImplHandoffManager, DecomposeFanoutManager],
})
export class TicketPlanningModule {}
