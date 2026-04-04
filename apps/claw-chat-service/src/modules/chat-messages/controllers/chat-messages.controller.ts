import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ChatMessagesService } from "../services/chat-messages.service";
import { ZodValidationPipe } from "../../../app/pipes/zod-validation.pipe";
import { CreateMessageDto, createMessageSchema } from "../dto/create-message.dto";
import { ListMessagesQueryDto, listMessagesQuerySchema } from "../dto/list-messages-query.dto";
import { CurrentUser } from "../../../app/decorators/current-user.decorator";
import { type AuthenticatedUser, type PaginatedResult } from "../../../common/types";
import { type ChatMessage } from "../../../generated/prisma";

@Controller("chat-messages")
export class ChatMessagesController {
  constructor(private readonly chatMessagesService: ChatMessagesService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createMessageSchema)) dto: CreateMessageDto,
  ): Promise<ChatMessage> {
    return this.chatMessagesService.createMessage(user.id, dto);
  }

  @Get("thread/:threadId")
  async findByThread(
    @Param("threadId") threadId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listMessagesQuerySchema)) query: ListMessagesQueryDto,
  ): Promise<PaginatedResult<ChatMessage>> {
    return this.chatMessagesService.getMessages(threadId, user.id, query);
  }

  @Get(":id")
  async findOne(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ChatMessage> {
    return this.chatMessagesService.getMessage(id, user.id);
  }
}
