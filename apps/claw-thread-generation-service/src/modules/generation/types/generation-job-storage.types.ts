import type { Prisma, ThreadGenerationStatus } from '../../../generated/prisma';
import type {
  BUDGET_CLOSURE_SELECT,
  DELETABLE_SELECT,
  DISPATCHABLE_SELECT,
  OWNER_STATE_SELECT,
  PROGRESS_JOB_SELECT,
  RETRY_SOURCE_SELECT,
  REVISION_PARENT_SELECT,
  UNREPORTED_FAILURE_SELECT,
} from '../constants/generation-job-select.constants';

import { type GenerationJobStorageResult } from '../../../common/enums/generation-job-storage-result.enum';

export type GenerationJobStorageResponse =
  | {
      result: GenerationJobStorageResult.SUCCESS;
      job: Prisma.ThreadGenerationJobGetPayload<object>;
    }
  | {
      result:
        | GenerationJobStorageResult.CONFLICT
        | GenerationJobStorageResult.RETRY_CONFLICT
        | GenerationJobStorageResult.STORAGE_ERROR
        | GenerationJobStorageResult.ACCOUNT_DELETED;
    };

export type GenerationJobIdempotencyResponse =
  | {
      result: GenerationJobStorageResult.SUCCESS;
      job: Prisma.ThreadGenerationJobGetPayload<{
        select: { id: true; ownerId: true; request: true; status: true; correlationId: true };
      }>;
    }
  | { result: GenerationJobStorageResult.CONFLICT };

type JobRowWithSelect<Select extends Prisma.ThreadGenerationJobSelect> =
  Prisma.ThreadGenerationJobGetPayload<{ select: Select }>;

export type GenerationJobRow = Prisma.ThreadGenerationJobGetPayload<object>;
export type GenerationJobRevisionParent = JobRowWithSelect<typeof REVISION_PARENT_SELECT>;
export type GenerationJobOwnerState = JobRowWithSelect<typeof OWNER_STATE_SELECT>;
export type GenerationJobProgressRow = JobRowWithSelect<typeof PROGRESS_JOB_SELECT>;
export type GenerationJobRetrySource = JobRowWithSelect<typeof RETRY_SOURCE_SELECT>;
export type GenerationJobDeletable = JobRowWithSelect<typeof DELETABLE_SELECT>;
export type GenerationJobDispatchable = JobRowWithSelect<typeof DISPATCHABLE_SELECT>;
export type GenerationJobBudgetClosure = JobRowWithSelect<typeof BUDGET_CLOSURE_SELECT>;
export type GenerationJobUnreportedFailure = JobRowWithSelect<typeof UNREPORTED_FAILURE_SELECT>;

export type GenerationResumeState = {
  evidenceBundle: GenerationJobRow['evidenceBundle'] | undefined;
  evidenceBundleHash: string | null | undefined;
  communications: Prisma.ThreadModelCommunicationGetPayload<{
    select: { role: true; round: true; evidenceBundleHash: true; output: true };
  }>[];
};

export type GenerationCancellationState = {
  status: ThreadGenerationStatus;
  queued: boolean;
  budgetId?: string;
};

export type GenerationEnqueueResult = { jobId: string; status: string };
export type GenerationJobDispatchView = Pick<GenerationJobRow, 'id' | 'status' | 'correlationId'>;

export type LeaseMonitor = {
  isLost: () => boolean;
  markLost: () => void;
  stop: () => void;
};
