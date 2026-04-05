import { HealthStatus } from '@/enums';

export function getHealthStatusColor(status: string | null): string {
  if (status === HealthStatus.HEALTHY) {
    return 'bg-emerald-600 dark:bg-emerald-500';
  }
  if (status === HealthStatus.DEGRADED) {
    return 'bg-amber-600 dark:bg-amber-500';
  }
  return 'bg-destructive';
}
