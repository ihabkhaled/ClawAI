import type { ThreadGenerationProgress } from '@claw/shared-types';

/**
 * The gateway adds the publication id; this service only knows the job. `allowanceRefunded` is true
 * when the platform failed the job and the Free allowance (money and lifetime Thread) was given back.
 */
export type ThreadGenerationProgressCore = Omit<ThreadGenerationProgress, 'publicationId'> & {
  allowanceRefunded: boolean;
};
