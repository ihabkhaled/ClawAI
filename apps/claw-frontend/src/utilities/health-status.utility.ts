import { HealthStatus, ServiceStatus } from '@/enums';

export function getHealthStatusColor(status: string | null): string {
  if (status === HealthStatus.HEALTHY) {
    return 'bg-emerald-600 dark:bg-emerald-500';
  }
  if (status === HealthStatus.DEGRADED) {
    return 'bg-amber-600 dark:bg-amber-500';
  }
  return 'bg-destructive';
}

/**
 * The i18n key for a health row that has no response time. A dependency row
 * (ClamAV, a scraper sidecar) is reported by the service that checks it, so it
 * carries no timing even when it is UP: it must read as operational, not as
 * unreachable.
 */
export function untimedServiceLabelKey(status: string): string {
  return status === ServiceStatus.UP ? 'observability.status.states.up' : 'dashboard.unreachable';
}
