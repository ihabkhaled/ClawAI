import { BadRequestException } from '@nestjs/common';

import { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';

import { isWebhookSupported } from './webhook-signature-verifiers.utility';

export function parseWebhookProvider(raw: string): WorkspaceProvider {
  const upper = raw.toUpperCase();
  const provider = Object.values(WorkspaceProvider).find((p) => p === upper);
  if (provider === undefined || !isWebhookSupported(provider)) {
    throw new BadRequestException({ messageKey: 'WEBHOOK_PROVIDER_UNSUPPORTED' });
  }
  return provider;
}
