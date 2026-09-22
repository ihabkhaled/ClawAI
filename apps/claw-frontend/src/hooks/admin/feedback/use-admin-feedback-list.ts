import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';

import { FeedbackSortDirection } from '@/enums';
import { usePagination } from '@/hooks/use-pagination';
import { feedbackAdminRepository } from '@/repositories/feedback/feedback-admin.repository';
import type { FeedbackListQuery, FeedbackStatusCounts } from '@/types';

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useAdminFeedbackList() {
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [type, setType] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState<string>('');
  // Page and page-size state is the shared control's, not this page's: the
  // hard-coded limit here meant a rows-per-page choice would have changed
  // nothing.
  const { page, pageSize, goToPage, setPageSize, reset } = usePagination();
  // The API validates sortBy against an allowlist and takes direction
  // separately. Sending '-createdAt' was rejected with a 400, so the admin list
  // silently rendered empty.
  const sortBy = 'createdAt';
  const sortDir = FeedbackSortDirection.DESC;

  const debouncedSearch = useDebouncedValue(search, 400);

  const queryFilters: FeedbackListQuery = useMemo(() => {
    const filters: FeedbackListQuery = { page, limit: pageSize, sortBy, sortDir };
    if (status) {
      filters.status = status;
    }
    if (type) {
      filters.type = type;
    }
    if (debouncedSearch) {
      filters.search = debouncedSearch;
    }
    return filters;
  }, [status, type, debouncedSearch, page, pageSize, sortBy, sortDir]);

  const {
    data: listData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['admin-feedback-list', queryFilters],
    queryFn: () => feedbackAdminRepository.list(queryFilters),
  });

  const { data: statsData } = useQuery({
    queryKey: ['admin-feedback-stats'],
    queryFn: () => feedbackAdminRepository.stats(),
  });

  const items = listData?.items ?? [];
  const total = listData?.total ?? 0;
  const counts = statsData as FeedbackStatusCounts | undefined;

  const updateStatus = (value: string | undefined): void => {
    setStatus(value);
    reset();
  };
  const updateType = (value: string | undefined): void => {
    setType(value);
    reset();
  };
  const updateSearch = (value: string): void => {
    setSearch(value);
    reset();
  };

  return {
    items,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    page,
    pageSize,
    setPage: goToPage,
    setPageSize,
    status,
    setStatus: updateStatus,
    type,
    setType: updateType,
    search,
    setSearch: updateSearch,
    counts,
    isLoading,
    isError,
    refetch,
  };
}
