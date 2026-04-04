import { Controller, Get, Param } from "@nestjs/common";
import { ChatThread } from "../../../generated/prisma";
import { ChatThreadsService } from "../services/chat-threads.service";
import { CurrentUser } from "../../../app/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../../common/types";

@Controller("chat-threads")
export class ChatThreadsController {
  constructor(private readonly chatThreadsService: ChatThreadsService) {}

  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser): Promise<ChatThread[]> {
    return this.chatThreadsService.findByUserId(user.id);
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<ChatThread> {
    return this.chatThreadsService.findById(id);
  }
}
