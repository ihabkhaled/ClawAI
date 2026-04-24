import type { UseSyncHealthPageResult } from '../../types/sync-health-hook.types';

import { useSyncHealthDashboard } from './use-sync-health-dashboard';

export function useSyncHealthPage(): UseSyncHealthPageResult {
  return useSyncHealthDashboard();
}
