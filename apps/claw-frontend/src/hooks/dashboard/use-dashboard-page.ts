import { useMemo } from 'react';

import { DASHBOARD_QUICK_ACTIONS } from '@/constants/dashboard.constants';
import { useAuthStore } from '@/stores/auth.store';
import type { DashboardPageResult } from '@/types/dashboard.types';
import {
  deriveDashboardOperationalState,
  getDashboardGreetingKey,
} from '@/utilities/dashboard-greeting.utility';

import { useDashboardData } from './use-dashboard-data';

export function useDashboardPage(): DashboardPageResult {
  const dashboardData = useDashboardData();
  const user = useAuthStore((state) => state.user);

  // Greeting key is recomputed once per render — Date.now() is cheap and the
  // dashboard doesn't need a per-second tick. Memoized so SSR/hydration
  // parity doesn't churn the hero subtree.
  const greetingKey = useMemo(() => getDashboardGreetingKey(new Date().getHours()), []);
  const greetingName = user?.username ?? '';
  const operationalState = deriveDashboardOperationalState(dashboardData.healthStatus);

  return {
    ...dashboardData,
    quickActions: DASHBOARD_QUICK_ACTIONS,
    greetingKey,
    greetingName,
    operationalState,
  };
}
