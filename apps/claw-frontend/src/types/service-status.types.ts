import type { ComponentState, StatusComponent, UptimeWindow } from '@/enums';

/** Uptime over one window, in integer basis points (10,000 = 100 %). */
export type ComponentUptime = {
  window: UptimeWindow;
  /** Null when nothing was measured in the window. */
  uptimeBasisPoints: number | null;
  /** How much of the window was measured at all, in basis points. */
  coverageBasisPoints: number;
};

/** One stretch of time during which a component was not fully up. */
export type StatusIncident = {
  component: StatusComponent;
  state: ComponentState;
  startedAt: string;
  /** Null while the incident is still open. */
  endedAt: string | null;
  durationSeconds: number;
};

/** One row of the service-status section. */
export type ComponentStatus = {
  component: StatusComponent;
  state: ComponentState;
  uptime: ComponentUptime[];
};

/** `GET /health/status`. Component keys, states, integers and timestamps only. */
export type StatusPageResponse = {
  generatedAt: string;
  overall: ComponentState;
  components: ComponentStatus[];
  incidents: StatusIncident[];
  historyAvailable: boolean;
  bucketSeconds: number;
};

export type UseServiceStatusReturn = {
  status: StatusPageResponse | undefined;
  isLoading: boolean;
  isError: boolean;
};

/** How a component state is shown: an icon and a colour, always next to its text label. */
export type ComponentStateAppearance = {
  labelKey: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  className: string;
};
