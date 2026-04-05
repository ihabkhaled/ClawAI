import { HealthStatus } from '@/enums';

export function getHealthStatusColor(status: string | null): string {
  if (status === HealthStatus.HEALTHY) {
    return 'bg-emerald-500';
  }
  if (status === HealthStatus.DEGRADED) {
    return 'bg-amber-500';
  }
  return 'bg-destructive';
}
