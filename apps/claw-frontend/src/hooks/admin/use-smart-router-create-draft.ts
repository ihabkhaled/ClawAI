import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { SMART_ROUTER_GLOBAL_SCOPE } from '@/constants/smart-router-admin.constants';
import { smartRouterAdminRepository } from '@/repositories/admin/smart-router-admin.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseSmartRouterCreateDraftResult } from '@/types/smart-router-admin.types';

export function useSmartRouterCreateDraft(): UseSmartRouterCreateDraftResult {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => smartRouterAdminRepository.createDraft({ scope: SMART_ROUTER_GLOBAL_SCOPE }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.smartRouterAdmin.all });
    },
  });

  const createDraft = useCallback((): void => {
    mutation.mutate();
  }, [mutation]);

  return { createDraft, isPending: mutation.isPending };
}
