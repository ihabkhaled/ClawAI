import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import {
  SESSION_FILTER_ALL_KEY,
  SESSION_PAGE_SIZE_DEFAULT,
} from '@/constants/admin-sessions.constants';
import { userSessionsRepository } from '@/repositories/admin/user-sessions.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { SessionStateFilter, UserSessionsResponse } from '@/types/admin-sessions.types';

const EMPTY_RESPONSE: UserSessionsResponse = {
  user: { id: '', username: '' },
  data: [],
  meta: { total: 0, page: 1, pageSize: SESSION_PAGE_SIZE_DEFAULT, totalPages: 1 },
  summary: { active: 0, expired: 0, terminated: 0, total: 0 },
};

/** One user's logins: filter, page and the query, newest activity first (the server sorts). */
export function useUserSessionsQuery(userId: string, enabled: boolean) {
  const [stateFilter, setStateFilterRaw] = useState<SessionStateFilter>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeRaw] = useState(SESSION_PAGE_SIZE_DEFAULT);

  const query = useQuery({
    queryKey: queryKeys.adminSessions.list(
      userId,
      stateFilter ?? SESSION_FILTER_ALL_KEY,
      page,
      pageSize,
    ),
    queryFn: () => userSessionsRepository.list(userId, stateFilter, page, pageSize),
    enabled,
    placeholderData: keepPreviousData,
  });

  const setStateFilter = useCallback((value: SessionStateFilter): void => {
    setStateFilterRaw(value);
    setPage(1);
  }, []);
  const setPageSize = useCallback((value: number): void => {
    setPageSizeRaw(value);
    setPage(1);
  }, []);
  const retry = useCallback((): void => {
    void query.refetch();
  }, [query]);

  return {
    response: query.data ?? EMPTY_RESPONSE,
    isLoading: query.isLoading,
    isError: query.isError,
    stateFilter,
    setStateFilter,
    page,
    setPage,
    pageSize,
    setPageSize,
    retry,
  };
}
