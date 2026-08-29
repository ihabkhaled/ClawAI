import type { QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/repositories/shared/query-keys';

export async function invalidateUserPlanQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.billing.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.myEntitlements.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.me }),
    // A plan change re-grants the monthly connector credit, so the wallet and
    // its ledger are stale the moment the subscription moves.
    queryClient.invalidateQueries({ queryKey: queryKeys.credit.all }),
  ]);
}
