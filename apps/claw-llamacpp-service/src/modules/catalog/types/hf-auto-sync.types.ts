import {
  type HfAutoSyncOutcomeStatus,
  type HfAutoSyncTrigger,
} from '../../../common/enums';

export interface HfAutoSyncResult {
  repo: string;
  status: HfAutoSyncOutcomeStatus;
  reason?: string;
}

export interface HfAutoSyncReport {
  trigger: HfAutoSyncTrigger;
  imported: number;
  skipped: number;
  failed: number;
  results: HfAutoSyncResult[];
}
