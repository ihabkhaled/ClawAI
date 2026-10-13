import type { ThreadGenerationProgress } from '@claw/shared-types';

/** The gateway adds the publication id; this service only knows the job. */
export type ThreadGenerationProgressCore = Omit<ThreadGenerationProgress, 'publicationId'>;
