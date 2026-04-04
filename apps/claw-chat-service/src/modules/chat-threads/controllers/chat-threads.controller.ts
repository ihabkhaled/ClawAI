import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ChatThreadsService } from "../services/chat-threads.service";
import { ZodValidationPipe } from "../../../app/pipes/zod-validation.pipe";
import { CreateThreadDto, createThreadSchema } from "../dto/create-thread.dto";
import { UpdateThreadDto, updateThreadSchema } from "../dto/update-thread.dto";
import { ListThreadsQueryDto, listThreadsQuerySchema } from "../dto/list-threads-query.dto";
import { CurrentUser } from "../../../app/decorators/current-user.decorator";
import { type AuthenticatedUser, type PaginatedResult } from "../../../common/types";
import { type ChatThread } from "../../../generated/prisma";
import { type ThreadWithMessageCount } from "../types/chat-threads.types";

@Controller("chat-threads")
export class ChatThreadsController {
  constructor(private readonly chatThreadsService: ChatThreadsService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createThreadSchema)) dto: CreateThreadDto,
  ): Promise<ChatThread> {
    return this.chatThreadsService.createThread(user.id, dto);
  }

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listThreadsQuerySchema)) query: ListThreadsQueryDto,
  ): Promise<PaginatedResult<ThreadWithMessageCount>> {
    return this.chatThreadsService.getThreads(user.id, query);
  }

  @Get(":id")
  async findOne(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ChatThread> {
    return this.chatThreadsService.getThread(id, user.id);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateThreadSchema)) dto: UpdateThreadDto,
  ): Promise<ChatThread> {
    return this.chatThreadsService.updateThread(id, user.id, dto);
  }

  @Delete(":id")
  async remove(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ChatThread> {
    return this.chatThreadsService.deleteThread(id, user.id);
  }
}
