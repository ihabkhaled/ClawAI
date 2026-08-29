import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { CREDIT_LEDGER_STALE_MS } from '@/constants/credit.constants';
import { creditRepository } from '@/repositories/credit/credit.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import { useAuthStore } from '@/stores/auth.store';
import type { UseCreditLedgerReturn } from '@/types/credit-hook.types';
import { filterVisibleLedgerEntries } from '@/utilities/credit.utility';

// AC-9: "where did my $5 go" has to be answerable, or every top-up becomes a
// support ticket.
//
// Cursor-paged rather than offset-paged because the ledger is append-only and
// grows while the user reads: an offset would repeat or skip a row every time a
// request settled mid-scroll, and a ledger that appears to lose a line is worse
// than no ledger at all.
export function useCreditLedger(): UseCreditLedgerReturn {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const query = useInfiniteQuery({
    queryKey: queryKeys.credit.ledger(),
    queryFn: ({ pageParam }) => creditRepository.getLedger(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: isAuthenticated,
    staleTime: CREDIT_LEDGER_STALE_MS,
  });

  const entries = useMemo(
    () => filterVisibleLedgerEntries(query.data?.pages.flatMap((page) => page.entries) ?? []),
    [query.data],
  );

  const loadMore = useCallback((): void => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [query]);

  return {
    entries,
    isLoading: query.isLoading,
    isError: query.isError,
    hasMore: query.hasNextPage,
    isFetchingMore: query.isFetchingNextPage,
    loadMore,
  };
}
