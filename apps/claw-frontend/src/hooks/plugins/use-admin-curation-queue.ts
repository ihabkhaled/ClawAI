import type { AdminServerStatus } from '@claw/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { ADMIN_CURATION_QUERY_KEYS } from '@/constants/plugin-admin-curation.constants';
import { useTranslation } from '@/lib/i18n';
import { pluginAdminCurationRepository } from '@/repositories/plugins/plugin-admin-curation.repository';
import type {
  CurationQueueAction,
  UseAdminCurationQueueReturn,
} from '@/types/plugin-admin-curation.types';
import { adminCurationErrorKey } from '@/utilities/plugin-admin-curation.utility';

import { usePluginToast } from './use-plugin-toast';

/** The approval queue for users' own MCP servers: filter by state, approve, or reject with a reason. */
export function useAdminCurationQueue(): UseAdminCurationQueueReturn {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const notify = usePluginToast();
  const [filter, setFilter] = useState<AdminServerStatus>('PENDING_APPROVAL');
  const query = useQuery({
    queryKey: ADMIN_CURATION_QUERY_KEYS.servers(filter),
    queryFn: () => pluginAdminCurationRepository.listServers(filter),
  });
  const mutation = useMutation({
    mutationFn: (action: CurationQueueAction) =>
      action.reason === null
        ? pluginAdminCurationRepository.approveServer(action.id)
        : pluginAdminCurationRepository.rejectServer(action.id, action.reason),
    onSuccess: (_server, action) => {
      notify(
        action.reason === null
          ? 'pluginsAdminCatalog.toast.approved'
          : 'pluginsAdminCatalog.toast.rejected',
      );
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ADMIN_CURATION_QUERY_KEYS.serversRoot });
    },
  });
  return {
    filter,
    setFilter,
    servers: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    retry: () => {
      void query.refetch();
    },
    pendingId: mutation.isPending ? (mutation.variables?.id ?? null) : null,
    errorMessage: mutation.error === null ? null : t(adminCurationErrorKey(mutation.error)),
    approve: (id) => {
      mutation.mutate({ id, reason: null });
    },
    reject: (id, reason) => {
      mutation.mutate({ id, reason });
    },
  };
}
