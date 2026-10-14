import { useMutation } from '@tanstack/react-query';

import { pluginServersRepository } from '@/repositories/plugins/plugin-servers.repository';

/** Asks the backend to connect to the server and list its tools. A read of the remote, not a change here. */
export function useDiscoverPluginServer() {
  return useMutation({
    mutationFn: (id: string) => pluginServersRepository.discover(id),
  });
}
