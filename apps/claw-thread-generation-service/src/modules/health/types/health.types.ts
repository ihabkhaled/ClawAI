import type { HealthCheckStatus, ServiceStatus } from '@claw/shared-types';

export type HealthStatus = {
  status: HealthCheckStatus;
  timestamp: string;
  service: string;
  services: { database: ServiceStatus };
};
