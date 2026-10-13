import { Module } from '@nestjs/common';

import { ChatModelClient } from './chat-model.client';
import { ConnectorCatalogWindowClient } from './connector-catalog-window.client';
import { ModelContextClient } from './model-context.client';

@Module({
  providers: [ChatModelClient, ConnectorCatalogWindowClient, ModelContextClient],
  exports: [ChatModelClient, ModelContextClient],
})
export class ModelsModule {}
