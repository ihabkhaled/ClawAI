import { Module } from "@nestjs/common";
import { ChatThreadsController } from "./controllers/chat-threads.controller";
import { ChatThreadsInternalController } from "./controllers/chat-threads-internal.controller";
import { ChatThreadsService } from "./services/chat-threads.service";
import { ChatThreadsRepository } from "./repositories/chat-threads.repository";
import { ChatMessagesRepository } from "../chat-messages/repositories/chat-messages.repository";

@Module({
  controllers: [ChatThreadsController, ChatThreadsInternalController],
  providers: [ChatThreadsService, ChatThreadsRepository, ChatMessagesRepository],
  exports: [ChatThreadsService, ChatThreadsRepository],
})
export class ChatThreadsModule {}
