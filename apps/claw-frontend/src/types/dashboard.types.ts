import type {
  DashboardGreetingKey,
  DashboardOperationalState,
  DashboardStatGradient,
  HealthStatus,
} from '@/enums';

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
  gradient: DashboardStatGradient;
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
  // Personalized hero state — computed in use-dashboard-page so the TSX stays
  // pure render composition.
  greetingKey: DashboardGreetingKey;
  greetingName: string;
  operationalState: DashboardOperationalState;
};
