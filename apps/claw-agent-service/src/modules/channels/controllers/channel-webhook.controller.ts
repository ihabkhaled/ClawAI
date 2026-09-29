import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  type RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Public } from '@claw/shared-auth';
import type { Request } from 'express';
import { CHANNEL_SIGNATURE_HEADER, CHANNEL_TIMESTAMP_HEADER } from '../constants/channel.constants';
import { ChannelInboxService } from '../services/channel-inbox.service';
import type { ChannelIngestResult } from '../types/channel.types';

/**
 * The inbound half of a channel: a CI job or alerting tool posts here.
 *
 * `@Public()` because a CI runner cannot present a user JWT. Authenticity is
 * the mandatory HMAC over the raw bytes plus a timestamp window, checked in
 * the service — which is why this reads `req.rawBody`, not a parsed body.
 * Throttling stays on: an unauthenticated route must not be free to hammer.
 */
@Controller('agent/channels/inbound')
@Public()
export class ChannelWebhookController {
  constructor(private readonly channels: ChannelInboxService) {}

  @Post(':userId')
  @HttpCode(HttpStatus.ACCEPTED)
  async receive(
    @Param('userId') userId: string,
    @Req() request: RawBodyRequest<Request>,
    @Headers(CHANNEL_SIGNATURE_HEADER) signature: string | undefined,
    @Headers(CHANNEL_TIMESTAMP_HEADER) timestamp: string | undefined,
  ): Promise<ChannelIngestResult> {
    return this.channels.ingest(
      userId,
      { signature, timestamp },
      request.rawBody?.toString('utf8') ?? '',
    );
  }
}
