import { useMutation } from '@tanstack/react-query';

import { pluginInstallsRepository } from '@/repositories/plugins/plugin-installs.repository';

import { usePluginInvalidation } from './use-plugin-invalidation';

/** Replace or remove the stored API key. The response is a status only: the key never comes back. */
export function usePluginCredentialMutations() {
  const invalidate = usePluginInvalidation();
  const save = useMutation({
    mutationFn: (variables: { id: string; value: string }) =>
      pluginInstallsRepository.putCredential(variables.id, {
        kind: 'API_KEY',
        value: variables.value,
      }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => pluginInstallsRepository.deleteCredential(id),
    onSuccess: invalidate,
  });
  return { save, remove };
}
