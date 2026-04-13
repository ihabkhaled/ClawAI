import { useMutation, useQueryClient } from '@tanstack/react-query';

import { routingRepository } from '@/repositories/routing/routing.repository';
import { queryKeys } from '@/repositories/shared/query-keys';

export function usePromoteCase(runId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (caseId: string) => routingRepository.promoteCase(caseId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.replay.runs.suspicious(runId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.replay.runs.cases(runId) });
    },
  });
}
