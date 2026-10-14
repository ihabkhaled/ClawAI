import { useMutation } from '@tanstack/react-query';

import { pluginServersRepository } from '@/repositories/plugins/plugin-servers.repository';
import type { UpdatePluginServerVariables } from '@/types/plugin-servers.types';

import { usePluginServersInvalidation } from './use-plugin-servers-invalidation';

/** Switches a server on or off, or saves which of its tools are enabled. */
export function useUpdatePluginServer() {
  const invalidate = usePluginServersInvalidation();
  return useMutation({
    mutationFn: ({ id, body }: UpdatePluginServerVariables) =>
      pluginServersRepository.update(id, body),
    onSuccess: invalidate,
  });
}
