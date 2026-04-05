import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useDebounce } from '@/hooks/common/use-debounce';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';

export function useGlobalThreadSearch() {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const filters = useMemo<Record<string, unknown>>(
    () => (debouncedSearch ? { search: debouncedSearch, global: true } : {}),
    [debouncedSearch],
  );

  const params = useMemo((): Record<string, string> => {
    const result: Record<string, string> = {};
    if (debouncedSearch) {
      result['search'] = debouncedSearch;
      result['limit'] = '10';
    }
    return result;
  }, [debouncedSearch]);

  const query = useQuery({
    queryKey: queryKeys.threads.list(filters),
    queryFn: () => chatRepository.getThreads(params),
    enabled: !!debouncedSearch && isOpen,
  });

  const handleOpenChange = (open: boolean): void => {
    setIsOpen(open);
    if (!open) {
      setSearch('');
    }
  };

  return {
    threads: query.data?.data ?? [],
    isLoading: query.isLoading && !!debouncedSearch,
    search,
    setSearch,
    isOpen,
    handleOpenChange,
  };
}
