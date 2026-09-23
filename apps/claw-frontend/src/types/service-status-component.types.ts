import type { ComponentState } from '@/enums';

import type { AuditStats, CostSummary, LatencySummary, UsageSummary } from './audit.types';
import type { ComponentStatus, StatusIncident, StatusPageResponse } from './service-status.types';

export type ServiceStatusSectionProps = {
  status: StatusPageResponse | undefined;
  isLoading: boolean;
  isError: boolean;
};

export type ComponentStateBadgeProps = {
  state: ComponentState;
};

export type ComponentStatusRowProps = {
  entry: ComponentStatus;
};

export type StatusIncidentListProps = {
  incidents: StatusIncident[];
};

export type UsageOverviewProps = {
  summary: UsageSummary;
  cost: CostSummary;
  latency: LatencySummary;
  auditStats: AuditStats;
  isLoading: boolean;
  isError: boolean;
};
