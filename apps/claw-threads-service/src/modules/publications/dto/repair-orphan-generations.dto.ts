import { z } from 'zod';

import { ORPHAN_REPAIR_MAX_JOBS } from '../constants/generation-concurrency.constants';
import { safeText } from './safe-text.schema';

export const repairOrphanGenerationsSchema = z
  .object({
    jobs: z
      .array(z.object({ jobId: safeText(1, 128), ownerId: safeText(1, 64) }).strict())
      .min(1)
      .max(ORPHAN_REPAIR_MAX_JOBS),
  })
  .strict();

export type RepairOrphanGenerationsDto = z.infer<typeof repairOrphanGenerationsSchema>;
