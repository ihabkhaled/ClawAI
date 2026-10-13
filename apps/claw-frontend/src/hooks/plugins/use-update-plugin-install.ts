import type { UpdatePluginInstallRequest } from '@claw/shared-types';
import { useMutation } from '@tanstack/react-query';

import { pluginInstallsRepository } from '@/repositories/plugins/plugin-installs.repository';

import { usePluginInvalidation } from './use-plugin-invalidation';

/** Enable, disable or change the settings of one install. */
export function useUpdatePluginInstall() {
  const invalidate = usePluginInvalidation();
  return useMutation({
    mutationFn: (variables: { id: string; body: UpdatePluginInstallRequest }) =>
      pluginInstallsRepository.update(variables.id, variables.body),
    onSuccess: invalidate,
  });
}
