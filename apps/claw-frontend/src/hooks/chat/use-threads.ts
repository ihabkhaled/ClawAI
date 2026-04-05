import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useDebounce } from '@/hooks/common/use-debounce';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';

export function useThreads() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const filters = useMemo<Record<string, unknown>>(
    () => (debouncedSearch ? { search: debouncedSearch } : {}),
    [debouncedSearch],
  );

  const params = useMemo((): Record<string, string> => {
    const result: Record<string, string> = {};
    if (debouncedSearch) {
      result['search'] = debouncedSearch;
    }
    return result;
  }, [debouncedSearch]);

  const query = useQuery({
    queryKey: queryKeys.threads.list(filters),
    queryFn: () => chatRepository.getThreads(params),
  });

  return {
    threads: query.data?.data ?? [],
    total: query.data?.meta.total ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    search,
    setSearch,
  };
}
