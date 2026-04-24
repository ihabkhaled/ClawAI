export type CadenceOption = { value: number; labelKey: string };

export const CADENCE_OPTIONS: CadenceOption[] = [
  { value: 60, labelKey: 'workspaceSync.cadence.1m' },
  { value: 300, labelKey: 'workspaceSync.cadence.5m' },
  { value: 600, labelKey: 'workspaceSync.cadence.10m' },
  { value: 1800, labelKey: 'workspaceSync.cadence.30m' },
  { value: 3600, labelKey: 'workspaceSync.cadence.1h' },
];

export const CADENCE_MIN_SECONDS = 30;
export const CADENCE_MAX_SECONDS = 3600;

export const SYNC_HEALTH_REFRESH_MS = 5000;
