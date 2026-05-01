import type { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';

export type WebhookVerificationInput = {
  rawBody: Buffer;
  headers: Record<string, string | string[] | undefined>;
};

export type WebhookVerificationResult = {
  signatureValid: boolean;
  externalDeliveryId: string | null;
  eventType: string | null;
  signature: string | null;
  reason: string | null;
};

export type WebhookSignatureVerifier = {
  provider: WorkspaceProvider;
  verify(input: WebhookVerificationInput, secret: string): WebhookVerificationResult;
};

export type WebhookReceivePayload = {
  deliveryId: string;
  provider: WorkspaceProvider;
  connectorId: string | null;
  externalDeliveryId: string | null;
  eventType: string | null;
  body: Record<string, unknown> | unknown[];
  occurredAt: string;
};

export type WebhookRejectionPayload = {
  deliveryId: string;
  provider: WorkspaceProvider;
  connectorId: string | null;
  reasonCode: string;
  occurredAt: string;
};
