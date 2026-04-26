import { type ServiceStatus } from '@claw/shared-types';
import { type AggregatedHealthStatus } from '../enums/aggregated-health-status.enum';

export interface ServiceHealthResult {
  name: string;
  status: ServiceStatus;
  responseTimeMs: number | null;
  error: string | null;
}

export interface AggregatedHealthSummary {
  total: number;
  up: number;
  down: number;
}

export interface AggregatedHealth {
  status: AggregatedHealthStatus;
  timestamp: string;
  services: ServiceHealthResult[];
  summary: AggregatedHealthSummary;
}
