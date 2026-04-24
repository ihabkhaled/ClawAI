import type { WorkspaceSyncTriggeredBy } from '@claw/shared-types';

export type SyncRunOptions = {
  triggeredBy?: WorkspaceSyncTriggeredBy;
  runKey?: string;
  isDryRun?: boolean;
  actorUserId?: string | null;
};

export type RequiredSyncRunOptions = Required<SyncRunOptions>;
