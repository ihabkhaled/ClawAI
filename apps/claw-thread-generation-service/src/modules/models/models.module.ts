import { Module } from '@nestjs/common';

import { ChatModelClient } from './chat-model.client';
import { ModelContextClient } from './model-context.client';

@Module({
  providers: [ChatModelClient, ModelContextClient],
  exports: [ChatModelClient, ModelContextClient],
})
export class ModelsModule {}
