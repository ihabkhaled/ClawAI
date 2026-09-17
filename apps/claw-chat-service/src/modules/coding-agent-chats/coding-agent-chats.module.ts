import { Module } from '@nestjs/common';
import { CodingAgentChatsController } from './controllers/coding-agent-chats.controller';
import { CodingAgentChatsService } from './services/coding-agent-chats.service';
import { ChatThreadsRepository } from '../chat-threads/repositories/chat-threads.repository';
import { ChatMessagesRepository } from '../chat-messages/repositories/chat-messages.repository';

@Module({
  controllers: [CodingAgentChatsController],
  providers: [CodingAgentChatsService, ChatThreadsRepository, ChatMessagesRepository],
  exports: [CodingAgentChatsService],
})
export class CodingAgentChatsModule {}
