import type { Prisma } from '../../../generated/prisma';

// One outbox row. `eventId` is the envelope id the consumer's inbox
// de-duplicates on, so it must be generated once and never regenerated on a
// retry — otherwise a republish would look like a brand-new event.
export type EnqueueOutboxData = {
  pattern: string;
  eventId: string;
  aggregateType: string;
  aggregateId: string;
  payloadJson: Prisma.InputJsonValue;
};
