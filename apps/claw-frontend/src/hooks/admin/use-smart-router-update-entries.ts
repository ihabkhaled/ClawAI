import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { smartRouterAdminRepository } from '@/repositories/admin/smart-router-admin.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  ChainEntryInput,
  UseSmartRouterUpdateEntriesResult,
} from '@/types/smart-router-admin.types';

/** The single mutation behind add / remove / reorder alike — the PATCH
 * endpoint takes the full desired chain every time, so every entry edit in
 * this feature funnels through here regardless of which tab triggered it. */
export function useSmartRouterUpdateEntries(): UseSmartRouterUpdateEntriesResult {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (variables: { id: string; entries: ChainEntryInput[] }) =>
      smartRouterAdminRepository.updateEntries(variables.id, { entries: variables.entries }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.smartRouterAdmin.all });
    },
  });

  const updateEntries = useCallback(
    (id: string, entries: ChainEntryInput[]): void => {
      mutation.mutate({ id, entries });
    },
    [mutation],
  );

  return { updateEntries, isPending: mutation.isPending };
}
