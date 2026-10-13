import { useMutation } from '@tanstack/react-query';

import { installPluginWithCredential } from '@/services/plugins/plugin-install.service';

import { usePluginInvalidation } from './use-plugin-invalidation';
import { usePluginToast } from './use-plugin-toast';

/** Installs a plugin, then stores its key when it needs one. Refreshes every list that shows installs. */
export function useInstallPlugin() {
  const invalidate = usePluginInvalidation();
  const notify = usePluginToast();
  return useMutation({
    mutationFn: installPluginWithCredential,
    onSettled: invalidate,
    onSuccess: () => {
      notify('pluginsInstall.toast.installed');
    },
  });
}
