import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';

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
  const [page, setPage] = useState<number>(1);
  const limit = 20;
  const sort = '-createdAt';

  const debouncedSearch = useDebouncedValue(search, 400);

  useEffect(() => {
    setPage(1);
  }, [status, type, debouncedSearch]);

  const queryFilters: FeedbackListQuery = useMemo(() => {
    const filters: FeedbackListQuery = { page, limit, sortBy: sort };
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
  }, [status, type, debouncedSearch, page, limit, sort]);

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

  return {
    items,
    total,
    page,
    limit,
    setPage,
    status,
    setStatus,
    type,
    setType,
    search,
    setSearch,
    counts,
    isLoading,
    isError,
    refetch,
  };
}
