import { Controller, Get, Param, Query } from '@nestjs/common';
import { CodingAgentChatsService } from '../services/coding-agent-chats.service';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import {
  ListCodingAgentChatsQueryDto,
  listCodingAgentChatsQuerySchema,
} from '../dto/list-coding-agent-chats-query.dto';
import {
  ListCodingAgentMessagesQueryDto,
  listCodingAgentMessagesQuerySchema,
} from '../dto/list-coding-agent-messages-query.dto';
import { type AuthenticatedUser, type PaginatedResult } from '../../../common/types';
import { type CodingAgentMessage, type CodingAgentThread } from '../types/coding-agent-chats.types';

/**
 * A window onto the coding agent's conversations. Reads only.
 *
 * There is deliberately no POST, PATCH or DELETE here. The web app shows what
 * the agent did; it does not join in. Sending from this surface would mean
 * writing into a run that has already finished, on behalf of an agent that is
 * not listening.
 */
@Controller('coding-agent-chats')
export class CodingAgentChatsController {
  constructor(private readonly codingAgentChatsService: CodingAgentChatsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listCodingAgentChatsQuerySchema))
    query: ListCodingAgentChatsQueryDto,
  ): Promise<PaginatedResult<CodingAgentThread>> {
    return this.codingAgentChatsService.getThreads(user.id, query);
  }

  @Get(':id/messages')
  async findMessages(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listCodingAgentMessagesQuerySchema))
    query: ListCodingAgentMessagesQueryDto,
  ): Promise<readonly CodingAgentMessage[]> {
    return this.codingAgentChatsService.getMessages(user.id, id, query.limit);
  }
}
