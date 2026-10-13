import type { UpdatePluginAdminCatalogRequest } from '@claw/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { pluginAdminRepository } from '@/repositories/plugins/plugin-admin.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseAdminPluginCatalogReturn } from '@/types/plugin-installs.types';
import { pluginErrorKey } from '@/utilities/plugin-installs.utility';

/**
 * The admin catalog: every entry with its kill switch, featured flag and tools. A change
 * refreshes the admin list and the user-facing catalog, because a global disable changes
 * what users see on their next load.
 */
export function useAdminPluginCatalog(): UseAdminPluginCatalogReturn {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.plugins.adminCatalog(),
    queryFn: () => pluginAdminRepository.listCatalog(),
  });
  const mutation = useMutation({
    mutationFn: (variables: { slug: string; body: UpdatePluginAdminCatalogRequest }) =>
      pluginAdminRepository.updateCatalogEntry(variables.slug, variables.body),
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.plugins.adminCatalog() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.plugins.catalogRoot() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.plugins.installsRoot() }),
      ]);
    },
  });
  const send = (slug: string, body: UpdatePluginAdminCatalogRequest): void => {
    mutation.mutate({ slug, body });
  };

  return {
    entries: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    retry: () => {
      void query.refetch();
    },
    pendingSlug: mutation.isPending ? (mutation.variables?.slug ?? null) : null,
    setGloballyEnabled: (slug, globallyEnabled) => send(slug, { globallyEnabled }),
    setFeatured: (slug, featured) => send(slug, { featured }),
    setToolDisabled: (slug, name, disabledByAdmin) =>
      send(slug, { tools: [{ name, disabledByAdmin }] }),
    errorMessage: mutation.error === null ? null : t(pluginErrorKey(mutation.error)),
  };
}
