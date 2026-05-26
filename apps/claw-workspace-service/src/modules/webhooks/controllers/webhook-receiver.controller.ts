import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Public, Roles } from '@claw/shared-auth';
import { UserRole } from '@claw/shared-types';
import type { Request } from 'express';

import { RawWebhookBody } from '../../../app/decorators/raw-webhook-body.decorator';
import { RawWebhookBodyPipe } from '../../../app/pipes/raw-webhook-body.pipe';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type ListWebhookDeliveriesQueryDto,
  listWebhookDeliveriesQuerySchema,
} from '../dto/webhook-delivery.dto';
import { WebhookReceiverManager } from '../managers/webhook-receiver.manager';
import { WebhookDeliveryRepository } from '../repositories/webhook-delivery.repository';
import { parseWebhookProvider } from '../utilities/provider-parser.utility';
import type { WebhookReceiveResult } from '../types/webhook-manager.types';
import type { WebhookDelivery } from '../../../generated/prisma';

@Controller('workspace/webhooks')
export class WebhookReceiverController {
  constructor(
    private readonly receiver: WebhookReceiverManager,
    private readonly repo: WebhookDeliveryRepository,
  ) {}

  @Public()
  @Post(':provider/:connectorId')
  @HttpCode(HttpStatus.OK)
  async receive(
    @Param('provider') providerRaw: string,
    @Param('connectorId') connectorId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @RawWebhookBody(RawWebhookBodyPipe) rawBody: Buffer,
    @Req() req: Request,
  ): Promise<WebhookReceiveResult> {
    return this.receiver.receive(
      parseWebhookProvider(providerRaw),
      connectorId === '_' ? null : connectorId,
      rawBody,
      headers,
      (req.headers['x-forwarded-for'] as string | undefined) ?? req.ip ?? null,
    );
  }

  @Get('deliveries')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async list(
    @Query(new ZodValidationPipe(listWebhookDeliveriesQuerySchema))
    query: ListWebhookDeliveriesQueryDto,
  ): Promise<WebhookDelivery[]> {
    return this.repo.list(query);
  }

  @Post('deliveries/:id/replay')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  async replay(@Param('id') id: string): Promise<{ deliveryId: string }> {
    return this.receiver.replay(id);
  }
}
