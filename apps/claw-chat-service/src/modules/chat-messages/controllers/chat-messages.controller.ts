import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ChatMessagesService } from "../services/chat-messages.service";
import { ZodValidationPipe } from "../../../app/pipes/zod-validation.pipe";
import { CreateMessageDto, createMessageSchema } from "../dto/create-message.dto";
import { type ParallelMessageDto, parallelMessageSchema } from "../dto/parallel-message.dto";
import { ListMessagesQueryDto, listMessagesQuerySchema } from "../dto/list-messages-query.dto";
import { SetFeedbackDto, setFeedbackSchema } from "../dto/set-feedback.dto";
import { CurrentUser } from "../../../app/decorators/current-user.decorator";
import { type AuthenticatedUser, type PaginatedResult } from "../../../common/types";
import { type ParallelResponse } from "../types/parallel.types";
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

  @Post("parallel")
  async createParallel(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(parallelMessageSchema)) dto: ParallelMessageDto,
  ): Promise<ParallelResponse> {
    return this.chatMessagesService.createParallelMessage(user.id, dto);
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

  @Post(":id/regenerate")
  async regenerate(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ChatMessage> {
    return this.chatMessagesService.regenerateMessage(id, user.id);
  }

  @Patch(":id/feedback")
  async setFeedback(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(setFeedbackSchema)) dto: SetFeedbackDto,
  ): Promise<ChatMessage> {
    return this.chatMessagesService.setFeedback(user.id, id, dto.feedback);
  }
}
