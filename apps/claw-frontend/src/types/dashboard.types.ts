import type { HealthStatus } from '@/enums';

import type { AggregatedHealth } from './health.types';

export type DashboardStats = {
  totalThreads: number;
  activeConnectors: number;
  localModels: number;
  servicesUp: number;
  servicesTotal: number;
};

export type DashboardStatCard = {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
};

export type DashboardQuickAction = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
};

export type DashboardDataResult = {
  statCards: DashboardStatCard[];
  isLoading: boolean;
  isError: boolean;
  healthStatus: HealthStatus | null;
  healthServices: AggregatedHealth['services'];
  healthSummary: AggregatedHealth['summary'] | null;
};

export type DashboardPageResult = DashboardDataResult & {
  quickActions: DashboardQuickAction[];
};
