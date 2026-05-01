import { Module } from '@nestjs/common';

import { AiActionsModule } from '../ai-actions/ai-actions.module';

import { DigestController } from './controllers/digest.controller';
import { DigestActionItemExtractorManager } from './managers/digest-action-item-extractor.manager';
import { DigestBuilderManager } from './managers/digest-builder.manager';
import { DigestOrchestratorManager } from './managers/digest-orchestrator.manager';
import { DigestRepository } from './repositories/digest.repository';
import { DigestService } from './services/digest.service';

@Module({
  imports: [AiActionsModule],
  controllers: [DigestController],
  providers: [
    DigestRepository,
    DigestService,
    DigestBuilderManager,
    DigestOrchestratorManager,
    DigestActionItemExtractorManager,
  ],
  exports: [DigestService, DigestBuilderManager, DigestActionItemExtractorManager],
})
export class DigestModule {}
