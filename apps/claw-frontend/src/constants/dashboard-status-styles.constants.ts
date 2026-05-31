import { DashboardOperationalState, HealthStatus } from '@/enums';

// Tailwind class triplet per operational state used by the dashboard hero
// status pill. `pill` styles the outer rounded badge, `dot` colors the
// pulsing dot, and `labelKey` is the i18n key resolved by t() inside the
// hero so non-EN locales render in their native language.
export const DASHBOARD_OPERATIONAL_STATE_STYLES: Record<
  DashboardOperationalState,
  { readonly pill: string; readonly dot: string; readonly labelKey: string }
> = {
  [DashboardOperationalState.OPERATIONAL]: {
    pill: 'border-success/30 bg-success/10 text-success',
    dot: 'bg-success',
    labelKey: 'dashboard.allSystemsOperational',
  },
  [DashboardOperationalState.DEGRADED]: {
    pill: 'border-warning/30 bg-warning/10 text-warning',
    dot: 'bg-warning',
    labelKey: 'dashboard.someSystemsDegraded',
  },
  [DashboardOperationalState.DOWN]: {
    pill: 'border-destructive/30 bg-destructive/10 text-destructive',
    dot: 'bg-destructive',
    labelKey: 'dashboard.systemsDown',
  },
  [DashboardOperationalState.UNKNOWN]: {
    pill: 'border-border bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground',
    labelKey: 'dashboard.statusUnknown',
  },
};

// Aggregated health badge color treatment. Keyed by the HealthStatus enum.
export const DASHBOARD_HEALTH_STATUS_BADGE_STYLES: Record<HealthStatus, string> = {
  [HealthStatus.HEALTHY]: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
  [HealthStatus.DEGRADED]: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  [HealthStatus.UNHEALTHY]: 'border-destructive/40 text-destructive',
};
