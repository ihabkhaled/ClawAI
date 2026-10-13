import { useMutation } from '@tanstack/react-query';

import { pluginInstallsRepository } from '@/repositories/plugins/plugin-installs.repository';
import type { PluginConsentLevel } from '@/types/plugin-installs.types';

import { usePluginInvalidation } from './use-plugin-invalidation';

/** Grant or revoke the standing consent for one tool of one install. */
export function usePluginConsentMutations() {
  const invalidate = usePluginInvalidation();
  const grant = useMutation({
    mutationFn: (variables: { id: string; toolName: string; level: PluginConsentLevel }) =>
      pluginInstallsRepository.grantConsent(variables.id, {
        toolName: variables.toolName,
        level: variables.level,
      }),
    onSuccess: invalidate,
  });
  const revoke = useMutation({
    mutationFn: (variables: { id: string; toolName: string }) =>
      pluginInstallsRepository.revokeConsent(variables.id, variables.toolName),
    onSuccess: invalidate,
  });
  return { grant, revoke };
}
