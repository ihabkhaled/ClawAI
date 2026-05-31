// Gradient identifier for a dashboard stat card. Maps to a Tailwind class set
// in DASHBOARD_STAT_GRADIENT_STYLES so the card stays declarative and the page
// stays free of inline class strings (per src/components/dashboard rules).
export enum DashboardStatGradient {
  BRAND = 'BRAND',
  SUCCESS = 'SUCCESS',
  WARM = 'WARM',
  INFO = 'INFO',
}
