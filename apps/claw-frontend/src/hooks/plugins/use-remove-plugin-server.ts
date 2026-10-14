import { useMutation } from '@tanstack/react-query';

import { pluginServersRepository } from '@/repositories/plugins/plugin-servers.repository';

import { usePluginServersInvalidation } from './use-plugin-servers-invalidation';
import { usePluginToast } from './use-plugin-toast';

/** Removes a server; the backend deletes its key and tool list with it. */
export function useRemovePluginServer() {
  const invalidate = usePluginServersInvalidation();
  const notify = usePluginToast();
  return useMutation({
    mutationFn: (id: string) => pluginServersRepository.remove(id),
    onSuccess: async () => {
      await invalidate();
      notify('pluginsServers.toast.removed');
    },
  });
}
