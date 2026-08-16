import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { smartRouterAdminRepository } from '@/repositories/admin/smart-router-admin.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseSmartRouterPublishResult } from '@/types/smart-router-admin.types';

export function useSmartRouterPublish(): UseSmartRouterPublishResult {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (id: string) => smartRouterAdminRepository.publish(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.smartRouterAdmin.all });
    },
  });

  const publish = useCallback(
    (id: string): void => {
      mutation.mutate(id);
    },
    [mutation],
  );

  return { publish, isPending: mutation.isPending };
}
