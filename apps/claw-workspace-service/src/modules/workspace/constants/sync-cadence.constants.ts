import { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';

/**
 * Fallback cadence registry used when the SyncCadenceDefault DB seed has not
 * been applied yet (fresh dev environment) or when a provider was added to
 * the enum but not yet seeded. Source: FEATURES_v3 Stream 01 cadence table.
 *
 * DB values (SyncCadenceDefault) ALWAYS win over this constant.
 */
export const FALLBACK_CADENCE_SECONDS: Record<WorkspaceProvider, number> = {
  [WorkspaceProvider.SLACK]: 60,
  [WorkspaceProvider.GMAIL]: 120,
  [WorkspaceProvider.GITHUB]: 180,
  [WorkspaceProvider.JIRA]: 300,
  [WorkspaceProvider.GITLAB]: 300,
  [WorkspaceProvider.BITBUCKET]: 300,
  [WorkspaceProvider.GOOGLE_DRIVE]: 600,
  [WorkspaceProvider.MICROSOFT_ONEDRIVE]: 600,
  [WorkspaceProvider.MICROSOFT_SHAREPOINT]: 600,
  [WorkspaceProvider.CONFLUENCE]: 600,
  [WorkspaceProvider.CLICKUP]: 600,
  [WorkspaceProvider.FIGMA]: 900,
};

export const FALLBACK_BACKFILL_WINDOW_DAYS = 30;

export const SCHEDULER_LOCK_NAMESPACE = 'workspace.sync.scheduler';
export const SCHEDULER_TICK_NAME = 'workspace.sync.tick';
export const STALE_DETECTOR_TICK_NAME = 'workspace.sync.stale_detector';

export const SYNC_TICK_ROUTING_KEY_PREFIX = 'workspace.sync.tick';
export const SYNC_DLQ_ROUTING_KEY_PREFIX = 'workspace.sync.dlq';

export const DEFAULT_STALE_MULTIPLIER = 3;
export const DEFAULT_GLOBAL_CONCURRENCY = 20;
export const DEFAULT_PER_PROVIDER_CONCURRENCY = 5;
export const DEFAULT_PER_CONNECTOR_CONCURRENCY = 1;

export const DEFAULT_RETRY_BASE_MS = 1000;
export const DEFAULT_RETRY_JITTER_MS = 500;
export const DEFAULT_RETRY_MAX_ATTEMPTS = 3;

export const CADENCE_OVERRIDE_MIN_SECONDS = 30;
export const CADENCE_OVERRIDE_MAX_SECONDS = 3600;

export const MANUAL_SYNC_PRIORITY_RATE_LIMIT_PER_HOUR = 10;

export const SCHEDULER_TICK_CRON = '*/30 * * * * *';
export const STALE_DETECTOR_CRON = '*/60 * * * * *';

export const DEFAULT_SYNC_RUN_OPTIONS = {
  triggeredBy: 'manual' as const,
  runKey: '',
  isDryRun: false,
  actorUserId: null as string | null,
};

export const DASHBOARD_WINDOW_MS = 24 * 60 * 60 * 1000;
