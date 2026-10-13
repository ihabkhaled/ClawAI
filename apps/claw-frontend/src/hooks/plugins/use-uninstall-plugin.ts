import { useMutation } from '@tanstack/react-query';

import { pluginInstallsRepository } from '@/repositories/plugins/plugin-installs.repository';

import { usePluginInvalidation } from './use-plugin-invalidation';
import { usePluginToast } from './use-plugin-toast';

/** Removes an install; the server deletes its credential and consents with it. */
export function useUninstallPlugin() {
  const invalidate = usePluginInvalidation();
  const notify = usePluginToast();
  return useMutation({
    mutationFn: (id: string) => pluginInstallsRepository.uninstall(id),
    onSuccess: async () => {
      await invalidate();
      notify('pluginsInstall.toast.uninstalled');
    },
  });
}
