import type { Prisma } from '../../../generated/prisma';

import { type GenerationJobStorageResult } from '../../../common/enums/generation-job-storage-result.enum';

export type GenerationJobStorageResponse =
  | {
      result: GenerationJobStorageResult.SUCCESS;
      job: Prisma.ThreadGenerationJobGetPayload<object>;
    }
  | { result: GenerationJobStorageResult.CONFLICT | GenerationJobStorageResult.STORAGE_ERROR };
