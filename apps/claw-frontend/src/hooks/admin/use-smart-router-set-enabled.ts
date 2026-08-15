import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { SMART_ROUTER_GLOBAL_SCOPE } from '@/constants/smart-router-admin.constants';
import { smartRouterAdminRepository } from '@/repositories/admin/smart-router-admin.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseSmartRouterSetEnabledResult } from '@/types/smart-router-admin.types';

export function useSmartRouterSetEnabled(): UseSmartRouterSetEnabledResult {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (enabled: boolean) =>
      smartRouterAdminRepository.setEnabled(SMART_ROUTER_GLOBAL_SCOPE, enabled),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.smartRouterAdmin.all });
    },
  });

  const setEnabled = useCallback(
    (enabled: boolean): void => {
      mutation.mutate(enabled);
    },
    [mutation],
  );

  return { setEnabled, isPending: mutation.isPending };
}
