import { useQuery } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { pluginInstallsRepository } from '@/repositories/plugins/plugin-installs.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UsePluginInstallsReturn } from '@/types/plugin-installs.types';

/** The signed-in user's installs, with names in the viewer's language. Scoped by the server to the JWT. */
export function usePluginInstalls(): UsePluginInstallsReturn {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: queryKeys.plugins.installs(locale),
    queryFn: () => pluginInstallsRepository.list(),
  });
  return {
    installs: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    retry: () => {
      void query.refetch();
    },
  };
}
