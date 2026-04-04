import { Controller, Get, Param, Query } from "@nestjs/common";
import { ChatMessage } from "@prisma/client";
import { ChatMessagesService } from "../services/chat-messages.service";

@Controller("chat-messages")
export class ChatMessagesController {
  constructor(private readonly chatMessagesService: ChatMessagesService) {}

  @Get()
  async findByThread(@Query("threadId") threadId: string): Promise<ChatMessage[]> {
    return this.chatMessagesService.findByThreadId(threadId);
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<ChatMessage> {
    return this.chatMessagesService.findById(id);
  }
}
