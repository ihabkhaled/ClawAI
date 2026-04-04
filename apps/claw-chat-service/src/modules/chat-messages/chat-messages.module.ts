import { Module } from "@nestjs/common";
import { ChatMessagesController } from "./controllers/chat-messages.controller";
import { ChatMessagesService } from "./services/chat-messages.service";
import { ChatMessagesRepository } from "./repositories/chat-messages.repository";

@Module({
  controllers: [ChatMessagesController],
  providers: [ChatMessagesService, ChatMessagesRepository],
  exports: [ChatMessagesService],
})
export class ChatMessagesModule {}
