import { Module } from '@nestjs/common';

import { ChatMessagesModule } from '../chat-messages/chat-messages.module';
import { ChatThreadsModule } from '../chat-threads/chat-threads.module';
import { ChatSharesController } from './controllers/chat-shares.controller';
import { ChatSharesInternalController } from './controllers/chat-shares-internal.controller';
import { PublicChatSharesController } from './controllers/public-chat-shares.controller';
import { ShareAssetAdapter } from './adapters/share-asset.adapter';
import { ChatShareManager } from './managers/chat-share.manager';
import { ChatSharesRepository } from './repositories/chat-shares.repository';
import { ChatShareEventsService } from './services/chat-share-events.service';
import { ChatShareMapperService } from './services/chat-share-mapper.service';
import { PublicChatShareService } from './services/public-chat-share.service';
import { ShareAssetPublisherService } from './services/share-asset-publisher.service';

@Module({
  imports: [ChatThreadsModule, ChatMessagesModule],
  controllers: [ChatSharesController, PublicChatSharesController, ChatSharesInternalController],
  providers: [
    ChatShareManager,
    PublicChatShareService,
    ChatShareMapperService,
    ChatShareEventsService,
    ChatSharesRepository,
    ShareAssetPublisherService,
    ShareAssetAdapter,
  ],
  exports: [ChatShareManager, ChatSharesRepository],
})
export class ChatSharesModule {}
