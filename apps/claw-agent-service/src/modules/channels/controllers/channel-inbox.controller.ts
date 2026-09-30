import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Query } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import { type ChannelInboxQueryDto, channelInboxQuerySchema } from '../dto/channel-inbox-query.dto';
import { ChannelInboxService } from '../services/channel-inbox.service';
import type { ChannelInboxPage, ChannelWebhookInfo } from '../types/channel.types';

/** The owner's side of a channel: where to send events, and the inbox itself. */
@Controller('agent/channels')
export class ChannelInboxController {
  constructor(private readonly channels: ChannelInboxService) {}

  @Get('webhook')
  webhook(@CurrentUser() user: AuthenticatedUser): ChannelWebhookInfo {
    return this.channels.webhookInfo(user.id);
  }

  @Get('inbox')
  async inbox(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(channelInboxQuerySchema)) query: ChannelInboxQueryDto,
  ): Promise<ChannelInboxPage> {
    return this.channels.list(user.id, query.limit);
  }

  @Delete('inbox/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async ack(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.channels.ack(user.id, id);
  }
}
