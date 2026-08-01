import type { QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/repositories/shared/query-keys';

export async function invalidateUserPlanQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.billing.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.myEntitlements.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.me }),
  ]);
}
