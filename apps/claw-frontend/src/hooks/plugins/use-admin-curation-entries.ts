import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ADMIN_CURATION_QUERY_KEYS } from '@/constants/plugin-admin-curation.constants';
import { useTranslation } from '@/lib/i18n';
import { pluginAdminCurationRepository } from '@/repositories/plugins/plugin-admin-curation.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  CurationEntryAction,
  UseAdminCurationEntriesReturn,
} from '@/types/plugin-admin-curation.types';
import { adminCurationErrorKey } from '@/utilities/plugin-admin-curation.utility';

import { usePluginToast } from './use-plugin-toast';

/** The curated entries: list, switch on or off, health check and soft delete. */
export function useAdminCurationEntries(): UseAdminCurationEntriesReturn {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const notify = usePluginToast();
  const query = useQuery({
    queryKey: ADMIN_CURATION_QUERY_KEYS.entries,
    queryFn: () => pluginAdminCurationRepository.listEntries(),
  });
  const mutation = useMutation({
    mutationFn: async (action: CurationEntryAction): Promise<void> => {
      if (action.kind === 'enable') {
        await pluginAdminCurationRepository.setEnabled(action.slug, action.enabled);
      } else if (action.kind === 'health') {
        await pluginAdminCurationRepository.checkHealth(action.slug);
      } else {
        await pluginAdminCurationRepository.removeEntry(action.slug);
      }
    },
    onSuccess: (_result, action) => {
      if (action.kind === 'remove') {
        notify('pluginsAdminCatalog.toast.deleted');
      }
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ADMIN_CURATION_QUERY_KEYS.entries }),
        queryClient.invalidateQueries({ queryKey: queryKeys.plugins.adminCatalog() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.plugins.catalogRoot() }),
      ]);
    },
  });
  return {
    entries: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    retry: () => {
      void query.refetch();
    },
    pendingSlug: mutation.isPending ? (mutation.variables?.slug ?? null) : null,
    errorMessage: mutation.error === null ? null : t(adminCurationErrorKey(mutation.error)),
    setEnabled: (slug, enabled) => {
      mutation.mutate({ kind: 'enable', slug, enabled });
    },
    checkHealth: (slug) => {
      mutation.mutate({ kind: 'health', slug });
    },
    remove: (slug) => {
      mutation.mutate({ kind: 'remove', slug });
    },
  };
}
