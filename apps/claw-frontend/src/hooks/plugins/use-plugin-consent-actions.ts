import type { PluginConsentLevel } from '@/types/plugin-installs.types';

import { usePluginConsentMutations } from './use-plugin-consent-mutations';

/** Grant or revoke the standing consent for one tool of one install. */
export function usePluginConsentActions(installId: string) {
  const { grant, revoke } = usePluginConsentMutations();
  return {
    grantConsent: (toolName: string, level: PluginConsentLevel): void => {
      grant.mutate({ id: installId, toolName, level });
    },
    revokeConsent: (toolName: string): void => {
      revoke.mutate({ id: installId, toolName });
    },
    isConsentBusy: grant.isPending || revoke.isPending,
    consentError: grant.error ?? revoke.error,
  };
}
