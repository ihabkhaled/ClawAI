export enum HfAutoSyncTrigger {
  BOOTSTRAP = 'bootstrap',
  CRON = 'cron',
  MANUAL = 'manual',
}

export enum HfAutoSyncOutcomeStatus {
  IMPORTED = 'IMPORTED',
  SKIPPED = 'SKIPPED',
  FAILED = 'FAILED',
}
