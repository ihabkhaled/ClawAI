import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { queryKeys } from '@/repositories/shared/query-keys';

/** A server change reaches the servers list and the `@` mentions, which list a server's tools. */
export function usePluginServersInvalidation(): () => Promise<void> {
  const queryClient = useQueryClient();
  return useCallback(async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.plugins.serversRoot() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.plugins.mentionsRoot() }),
    ]);
  }, [queryClient]);
}
