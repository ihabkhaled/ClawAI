export type OutboxPublishCandidate = Readonly<{
  id: string;
  pattern: string;
  eventId: string;
  payloadJson: unknown;
  attempts: number;
}>;
