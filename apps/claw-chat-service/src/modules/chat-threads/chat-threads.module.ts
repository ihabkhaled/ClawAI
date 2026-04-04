import { Module } from "@nestjs/common";
import { ChatThreadsController } from "./controllers/chat-threads.controller";
import { ChatThreadsService } from "./services/chat-threads.service";
import { ChatThreadsRepository } from "./repositories/chat-threads.repository";

@Module({
  controllers: [ChatThreadsController],
  providers: [ChatThreadsService, ChatThreadsRepository],
  exports: [ChatThreadsService],
})
export class ChatThreadsModule {}
