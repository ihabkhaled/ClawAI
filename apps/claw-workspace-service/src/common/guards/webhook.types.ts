import { type WebhookProviderKind } from '../../common/enums/webhook-provider-kind.enum';

export type { WebhookProviderKind };

export type WebhookGuardRequest = {
  headers: Record<string, string | string[] | undefined>;
  rawBody?: unknown;
  body?: unknown;
  webhookSecret?: string;
};
