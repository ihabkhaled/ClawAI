import type { HealthCheckStatus } from '@claw/shared-types';

export type HealthStatus = {
  status: HealthCheckStatus;
  timestamp: string;
  service: string;
};
