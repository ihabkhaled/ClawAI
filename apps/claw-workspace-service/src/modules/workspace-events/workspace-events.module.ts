import { Module } from '@nestjs/common';

import { WebhookIngestConsumer } from './consumers/webhook-ingest.consumer';
import { WorkspaceEventRepository } from './repositories/workspace-event.repository';
import { WorkspaceEventMapperService } from './services/workspace-event-mapper.service';

@Module({
  providers: [WorkspaceEventMapperService, WorkspaceEventRepository, WebhookIngestConsumer],
  exports: [WorkspaceEventMapperService, WorkspaceEventRepository],
})
export class WorkspaceEventsModule {}
