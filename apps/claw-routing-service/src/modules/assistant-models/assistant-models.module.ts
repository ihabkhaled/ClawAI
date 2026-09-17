import { Module } from '@nestjs/common';

import { AssistantModelsController } from './controllers/assistant-models.controller';
import { AssistantModelsInternalController } from './controllers/assistant-models-internal.controller';
import { AssistantModelRepository } from './repositories/assistant-model.repository';
import { AssistantModelService } from './services/assistant-model.service';

@Module({
  controllers: [AssistantModelsController, AssistantModelsInternalController],
  providers: [AssistantModelService, AssistantModelRepository],
  exports: [AssistantModelService],
})
export class AssistantModelsModule {}
