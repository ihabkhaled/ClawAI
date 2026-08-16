import { Module } from '@nestjs/common';

import { WebhookIngestConsumer } from './consumers/webhook-ingest.consumer';
import { WorkspaceEventRepository } from './repositories/workspace-event.repository';
import { WorkspaceEventMapperService } from './services/workspace-event-mapper.service';
import { WorkspaceSyncEventBridgeService } from './services/workspace-sync-event-bridge.service';

@Module({
  providers: [
    WorkspaceEventMapperService,
    WorkspaceEventRepository,
    WorkspaceSyncEventBridgeService,
    WebhookIngestConsumer,
  ],
  exports: [WorkspaceEventMapperService, WorkspaceEventRepository, WorkspaceSyncEventBridgeService],
})
export class WorkspaceEventsModule {}
