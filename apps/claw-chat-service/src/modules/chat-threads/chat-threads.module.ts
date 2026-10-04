import { Module } from '@nestjs/common';
import { ChatThreadsController } from './controllers/chat-threads.controller';
import { ChatThreadsInternalController } from './controllers/chat-threads-internal.controller';
import { ChatThreadsService } from './services/chat-threads.service';
import { ChatThreadsRepository } from './repositories/chat-threads.repository';
import { ChatMessagesRepository } from '../chat-messages/repositories/chat-messages.repository';
import { DailyLimitService } from '../chat-messages/services/daily-limit.service';
import { ThreadSnapshotInternalController } from './controllers/thread-snapshot-internal.controller';
import { ThreadSnapshotService } from './services/thread-snapshot.service';

@Module({
  controllers: [
    ChatThreadsController,
    ChatThreadsInternalController,
    ThreadSnapshotInternalController,
  ],
  providers: [
    ChatThreadsService,
    ThreadSnapshotService,
    ChatThreadsRepository,
    ChatMessagesRepository,
    DailyLimitService,
  ],
  exports: [ChatThreadsService, ChatThreadsRepository],
})
export class ChatThreadsModule {}
