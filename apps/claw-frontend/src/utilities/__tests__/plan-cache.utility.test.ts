import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { queryKeys } from '@/repositories/shared/query-keys';
import { invalidateUserPlanQueries } from '@/utilities/plan-cache.utility';

describe('invalidateUserPlanQueries', () => {
  it('invalidates billing, entitlement, and current-user state together', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(queryKeys.billing.current(), { id: 'subscription-1' });
    queryClient.setQueryData(queryKeys.myEntitlements.all, { plan: { id: 'plan-1' } });
    queryClient.setQueryData(queryKeys.auth.me, { id: 'user-1' });

    await invalidateUserPlanQueries(queryClient);

    expect(queryClient.getQueryState(queryKeys.billing.current())?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(queryKeys.myEntitlements.all)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(queryKeys.auth.me)?.isInvalidated).toBe(true);
  });
});
