import type { PullJobCancelOutcome } from '@/enums/pull-job-cancel-outcome.enum';

export interface CancelPullResult {
  id: string;
  status: PullJobCancelOutcome;
}
