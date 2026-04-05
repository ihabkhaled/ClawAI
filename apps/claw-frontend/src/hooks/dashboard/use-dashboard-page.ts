import { DASHBOARD_QUICK_ACTIONS } from '@/constants/dashboard.constants';
import type { DashboardPageResult } from '@/types/dashboard.types';

import { useDashboardData } from './use-dashboard-data';

export function useDashboardPage(): DashboardPageResult {
  const dashboardData = useDashboardData();

  return {
    ...dashboardData,
    quickActions: DASHBOARD_QUICK_ACTIONS,
  };
}
