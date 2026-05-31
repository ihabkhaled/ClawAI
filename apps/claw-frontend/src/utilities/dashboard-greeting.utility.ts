import {
  DASHBOARD_GREETING_AFTERNOON_HOUR_MIN,
  DASHBOARD_GREETING_EVENING_HOUR_MIN,
  DASHBOARD_GREETING_MORNING_HOUR_MIN,
} from '@/constants/dashboard.constants';
import { DashboardGreetingKey, DashboardOperationalState, HealthStatus } from '@/enums';

// Map a clock hour (0–23) to a dashboard greeting translation key.
// 5–11   → morning
// 12–17  → afternoon
// 18–4   → evening (wraps midnight)
export function getDashboardGreetingKey(hour: number): DashboardGreetingKey {
  if (hour >= DASHBOARD_GREETING_MORNING_HOUR_MIN && hour < DASHBOARD_GREETING_AFTERNOON_HOUR_MIN) {
    return DashboardGreetingKey.MORNING;
  }
  if (hour >= DASHBOARD_GREETING_AFTERNOON_HOUR_MIN && hour < DASHBOARD_GREETING_EVENING_HOUR_MIN) {
    return DashboardGreetingKey.AFTERNOON;
  }
  return DashboardGreetingKey.EVENING;
}

// Derive the operational state pill value from the aggregated HealthStatus.
// Returns UNKNOWN for a null/loading state so the hero can show a neutral pill.
export function deriveDashboardOperationalState(
  status: HealthStatus | null,
): DashboardOperationalState {
  if (status === HealthStatus.HEALTHY) {
    return DashboardOperationalState.OPERATIONAL;
  }
  if (status === HealthStatus.DEGRADED) {
    return DashboardOperationalState.DEGRADED;
  }
  if (status === HealthStatus.UNHEALTHY) {
    return DashboardOperationalState.DOWN;
  }
  return DashboardOperationalState.UNKNOWN;
}
