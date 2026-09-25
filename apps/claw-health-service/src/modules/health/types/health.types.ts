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
  /**
   * Dependencies their source reported `disabled` (DEPENDENCY_PROBES). Not in
   * `services`: disabled is neither up nor down, and must never read as an outage.
   */
  disabledDependencies: string[];
}

/**
 * A dependency read from another service's `/health` body:
 * `body.services[key]` of `source`, published under `name`.
 */
export interface DependencyProbe {
  name: string;
  source: string;
  key: string;
}

/** What one service's health check produced: its row, and the body it answered with. */
export interface ServiceCheckOutcome {
  result: ServiceHealthResult;
  body: unknown;
}
