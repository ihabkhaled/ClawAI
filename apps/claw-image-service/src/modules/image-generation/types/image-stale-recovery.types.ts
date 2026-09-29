import { type ImageGenerationStatus } from '../../../generated/prisma';

/** A running row the stale-job recovery may time out (`IMAGE_STALE_JOB_SELECT`). */
export type ImageStaleJobRecord = {
  id: string;
  userId: string;
  prompt: string;
  provider: string;
  model: string;
  status: ImageGenerationStatus;
  /** The open PAYG hold of the attempt, or null (local provider, unmetered, not reserved yet). */
  paygReservationId: string | null;
};
