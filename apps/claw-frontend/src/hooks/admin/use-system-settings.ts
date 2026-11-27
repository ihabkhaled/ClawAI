import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { systemSettingsRepository } from '@/repositories/admin/system-settings.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseSystemSettingsReturn } from '@/types/admin-security-settings.types';

/**
 * Every SystemSetting row (ADMIN_SYSTEM_VIEW). No refetch on focus: the page
 * re-seeds its form from this data, and a background refetch would wipe what
 * the operator is typing.
 */
export function useSystemSettings(): UseSystemSettingsReturn {
  const query = useQuery({
    queryKey: queryKeys.admin.systemSettings,
    queryFn: () => systemSettingsRepository.list(),
    refetchOnWindowFocus: false,
  });
  const refetch = useCallback((): void => {
    void query.refetch();
  }, [query]);
  return { settings: query.data, isLoading: query.isLoading, isError: query.isError, refetch };
}
