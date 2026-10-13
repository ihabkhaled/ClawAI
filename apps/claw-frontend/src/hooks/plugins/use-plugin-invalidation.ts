import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { queryKeys } from '@/repositories/shared/query-keys';

/**
 * Everything an install, uninstall, toggle or consent change can make stale: the installs
 * list, the `@` mentions, the Discover cards (their Installed badge) and the detail page.
 * The installs and catalog keys are real queries today; the mentions prefix is the one the
 * composer `@` picker will use in batch 4, so a change made here already reaches it.
 */
export function usePluginInvalidation(): () => Promise<void> {
  const queryClient = useQueryClient();
  return useCallback(async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.plugins.installsRoot() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.plugins.mentionsRoot() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.plugins.catalogRoot() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.plugins.detailRoot() }),
    ]);
  }, [queryClient]);
}
