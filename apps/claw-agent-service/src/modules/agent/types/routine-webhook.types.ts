/** What the owner needs to point a CI job or relay at one routine. */
export type RoutineWebhookInfo = {
  enabled: boolean;
  url: string;
  secret: string;
  signatureHeader: string;
  timestampHeader: string;
  signatureFormat: string;
  minSecondsBetweenDeliveries: number;
};

export type RoutineWebhookHeaders = {
  signature: string | undefined;
  timestamp: string | undefined;
};

export type RoutineWebhookResult = {
  accepted: true;
  commandId: string;
  /** True when this exact delivery already fired the routine; nothing ran again. */
  replayed: boolean;
};
