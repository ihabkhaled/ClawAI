import { useQuery } from '@tanstack/react-query';

import { PLUGIN_SERVERS_EMPTY_LIST } from '@/constants/plugin-servers.constants';
import { pluginServersRepository } from '@/repositories/plugins/plugin-servers.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UsePluginServersReturn } from '@/types/plugin-servers.types';

/** The signed-in user's own MCP servers and their plan cap. Scoped by the server to the JWT. */
export function usePluginServers(): UsePluginServersReturn {
  const query = useQuery({
    queryKey: queryKeys.plugins.servers(),
    queryFn: () => pluginServersRepository.list(),
  });
  return {
    list: query.data ?? PLUGIN_SERVERS_EMPTY_LIST,
    isLoading: query.isLoading,
    isError: query.isError,
    retry: () => {
      void query.refetch();
    },
  };
}
