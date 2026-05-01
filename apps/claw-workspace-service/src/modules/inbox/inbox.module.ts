import { Module } from '@nestjs/common';

import { WorkspaceObjectEmbedConsumer } from './consumers/workspace-object-embed.consumer';
import { InboxController } from './controllers/inbox.controller';
import { InboxService } from './services/inbox.service';
import { WorkspaceSemanticSearchService } from './services/workspace-semantic-search.service';

@Module({
  controllers: [InboxController],
  providers: [InboxService, WorkspaceSemanticSearchService, WorkspaceObjectEmbedConsumer],
  exports: [InboxService, WorkspaceSemanticSearchService],
})
export class InboxModule {}
