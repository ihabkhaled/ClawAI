import { type ImageGenerationStatus } from '../../../generated/prisma';

/** `POST /images/:id/cancel` response: the row's status AFTER the call. */
export type ImageCancelResult = {
  generationId: string;
  status: ImageGenerationStatus;
};

/**
 * Asks the shared store whether this generation was cancelled. Read from the
 * DB row (not process memory), so a cancel taken by any replica is seen.
 */
export type ImageCancellationProbe = () => Promise<boolean>;
