export type DashboardStats = {
  totalThreads: number;
  activeConnectors: number;
  localModels: number;
  routingDecisionsToday: number;
};

export type DashboardStatCard = {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
};

export type DashboardQuickAction = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
};
