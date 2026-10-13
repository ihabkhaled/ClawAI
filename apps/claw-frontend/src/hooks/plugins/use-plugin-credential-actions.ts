import { useState } from 'react';

import { usePluginCredentialMutations } from './use-plugin-credential-mutations';
import { usePluginToast } from './use-plugin-toast';

/**
 * Replace or remove the stored key of one install. The typed key lives in this state
 * only until the call returns; nothing the server sends back contains it.
 */
export function usePluginCredentialActions(installId: string) {
  const { save, remove } = usePluginCredentialMutations();
  const notify = usePluginToast();
  const [credentialDraft, setCredentialDraft] = useState('');

  return {
    credentialDraft,
    setCredentialDraft,
    saveCredential: (): void => {
      save.mutate(
        { id: installId, value: credentialDraft.trim() },
        {
          onSuccess: () => {
            setCredentialDraft('');
            notify('pluginsInstall.toast.credentialSaved');
          },
        },
      );
    },
    removeCredential: (): void => {
      remove.mutate(installId, {
        onSuccess: () => notify('pluginsInstall.toast.credentialRemoved'),
      });
    },
    isCredentialBusy: save.isPending || remove.isPending,
    credentialError: save.error ?? remove.error,
  };
}
