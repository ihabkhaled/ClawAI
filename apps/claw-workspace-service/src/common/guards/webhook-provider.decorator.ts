import { SetMetadata } from '@nestjs/common';
import { WEBHOOK_PROVIDER_METADATA } from '../constants/webhook.constants';
import { type WebhookProviderKind } from '../enums/webhook-provider-kind.enum';

export const WebhookProvider = (kind: WebhookProviderKind): MethodDecorator =>
  SetMetadata(WEBHOOK_PROVIDER_METADATA, kind);
