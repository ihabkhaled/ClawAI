import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type AuthenticatedUser } from '../../../common/types';
import {
  type PublishShareDto,
  publishShareSchema,
  type ThreadParamDto,
  threadParamSchema,
  type UpdateShareDto,
  updateShareSchema,
} from '../dto/chat-share.dto';
import { ChatShareManager } from '../managers/chat-share.manager';
import { type OwnerChatShareView } from '../types/chat-shares.types';

/**
 * Owner-only share management.
 *
 * The identity comes from `@CurrentUser` on every route and is never read from
 * a body or a path. The manager independently re-checks that the thread belongs
 * to that user, so an IDOR attempt fails at the data layer even if a future
 * route forgot to.
 */
@Controller('chat-threads/:threadId/share')
export class ChatSharesController {
  constructor(private readonly shares: ChatShareManager) {}

  @Get()
  async get(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(threadParamSchema)) params: ThreadParamDto,
  ): Promise<OwnerChatShareView | null> {
    return this.shares.getForOwner(params.threadId, user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async publish(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(threadParamSchema)) params: ThreadParamDto,
    @Body(new ZodValidationPipe(publishShareSchema)) dto: PublishShareDto,
  ): Promise<OwnerChatShareView> {
    return this.shares.publish({
      threadId: params.threadId,
      userId: user.id,
      allowIndexing: dto.allowIndexing,
    });
  }

  @Patch()
  async updateVisibility(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(threadParamSchema)) params: ThreadParamDto,
    @Body(new ZodValidationPipe(updateShareSchema)) dto: UpdateShareDto,
  ): Promise<OwnerChatShareView> {
    return this.shares.updateVisibility({
      threadId: params.threadId,
      userId: user.id,
      allowIndexing: dto.allowIndexing,
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(threadParamSchema)) params: ThreadParamDto,
  ): Promise<OwnerChatShareView> {
    return this.shares.refresh(params.threadId, user.id);
  }

  @Post('regenerate-url')
  @HttpCode(HttpStatus.OK)
  async regenerateUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(threadParamSchema)) params: ThreadParamDto,
  ): Promise<OwnerChatShareView> {
    return this.shares.regenerateUrl(params.threadId, user.id);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(threadParamSchema)) params: ThreadParamDto,
  ): Promise<void> {
    await this.shares.revoke(params.threadId, user.id);
  }
}
