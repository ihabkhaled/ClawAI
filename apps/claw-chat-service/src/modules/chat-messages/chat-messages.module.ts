import { Module } from "@nestjs/common";
import { ChatMessagesController } from "./controllers/chat-messages.controller";
import { ChatStreamController } from "./controllers/chat-stream.controller";
import { ChatMessagesService } from "./services/chat-messages.service";
import { ChatExecutionManager } from "./managers/chat-execution.manager";
import { ContextAssemblyManager } from "./managers/context-assembly.manager";
import { ChatMessagesRepository } from "./repositories/chat-messages.repository";
import { ChatThreadsRepository } from "../chat-threads/repositories/chat-threads.repository";

@Module({
  controllers: [ChatMessagesController, ChatStreamController],
  providers: [ChatMessagesService, ChatExecutionManager, ContextAssemblyManager, ChatMessagesRepository, ChatThreadsRepository],
  exports: [ChatMessagesService, ChatMessagesRepository],
})
export class ChatMessagesModule {}
