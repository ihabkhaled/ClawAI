// What is persisted about an inbound webhook.
//
// Deliberately NOT the raw body: it can contain payer details, and a hash is
// enough to prove a duplicate delivery.
export type RecordWebhookData = {
  gateway: string;
  providerEventId: string;
  eventType: string;
  payloadHash: string;
  signatureValid: boolean;
};
