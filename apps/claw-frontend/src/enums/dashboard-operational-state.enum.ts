// Operational state surfaced in the dashboard hero pill. Maps 1:1 to a color
// treatment + translation key in DASHBOARD_OPERATIONAL_STATE_STYLES.
export enum DashboardOperationalState {
  OPERATIONAL = 'OPERATIONAL',
  DEGRADED = 'DEGRADED',
  DOWN = 'DOWN',
  UNKNOWN = 'UNKNOWN',
}
