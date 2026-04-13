import { useQuery } from '@tanstack/react-query';

import { RECOVERY_STATS_LIMIT } from '@/constants';
import { routingRepository } from '@/repositories/routing/routing.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { RecoveryStats } from '@/types';

export function useRecoveryStats(): {
  data: RecoveryStats | undefined;
  isLoading: boolean;
  isError: boolean;
} {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.routing.recovery(RECOVERY_STATS_LIMIT),
    queryFn: () => routingRepository.getRecoveryStats(RECOVERY_STATS_LIMIT),
  });

  return { data, isLoading, isError };
}
