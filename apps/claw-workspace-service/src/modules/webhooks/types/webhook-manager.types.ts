export type WebhookReceiveResult =
  | { status: 'ACCEPTED'; deliveryId: string; signatureValid: true }
  | { status: 'IDEMPOTENT'; deliveryId: string; signatureValid: true }
  | {
      status: 'REJECTED';
      deliveryId: string;
      signatureValid: false;
      reasonCode: string;
    };
