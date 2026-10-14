import { useQuery } from '@tanstack/react-query';

import { ADMIN_CURATION_QUERY_KEYS } from '@/constants/plugin-admin-curation.constants';
import { pluginAdminCurationRepository } from '@/repositories/plugins/plugin-admin-curation.repository';
import type { UseAdminCurationAuditReturn } from '@/types/plugin-admin-curation.types';

/** The latest admin changes, newest first. */
export function useAdminCurationAudit(): UseAdminCurationAuditReturn {
  const query = useQuery({
    queryKey: ADMIN_CURATION_QUERY_KEYS.audit,
    queryFn: () => pluginAdminCurationRepository.listAudit(),
  });
  return {
    rows: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    retry: () => {
      void query.refetch();
    },
  };
}
