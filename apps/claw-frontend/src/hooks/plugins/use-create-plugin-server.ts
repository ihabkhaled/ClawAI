import { useMutation } from '@tanstack/react-query';

import { pluginServersRepository } from '@/repositories/plugins/plugin-servers.repository';
import type { CreatePluginServerRequest } from '@/types/plugin-servers.types';

import { usePluginServersInvalidation } from './use-plugin-servers-invalidation';
import { usePluginToast } from './use-plugin-toast';

/** Registers a server. The backend refuses private addresses and a full plan with a code. */
export function useCreatePluginServer() {
  const invalidate = usePluginServersInvalidation();
  const notify = usePluginToast();
  return useMutation({
    mutationFn: (body: CreatePluginServerRequest) => pluginServersRepository.create(body),
    onSuccess: async () => {
      await invalidate();
      notify('pluginsServers.toast.added');
    },
  });
}
