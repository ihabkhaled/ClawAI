import type { HealthStatus, ServiceStatus } from '@/enums';

export type ServiceHealthResult = {
  name: string;
  status: ServiceStatus;
  responseTimeMs: number | null;
  error: string | null;
};

export type AggregatedHealth = {
  status: HealthStatus;
  timestamp: string;
  services: ServiceHealthResult[];
  summary: {
    total: number;
    up: number;
    down: number;
  };
};
