import { DeploymentRunStatus } from '@claw/shared-types';
import { useQuery } from '@tanstack/react-query';

import {
  DEPLOYMENT_RUN_POLL_ACTIVE_MS,
  DEPLOYMENT_RUN_POLL_IDLE_MS,
} from '@/constants/deployment.constants';
import { deploymentRepository } from '@/repositories/admin/deployment.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseDeploymentRunProgressResult } from '@/types/deployment-page.types';

/**
 * Live GitHub Actions progress for the latest production run.
 *
 * Polls fast only while GitHub says the run is executing, and drops to a slow
 * heartbeat once it is finished — a completed run does not change, and the
 * token's rate limit is shared with the dispatch path.
 */
export function useDeploymentRunProgress(enabled: boolean): UseDeploymentRunProgressResult {
  const query = useQuery({
    queryKey: queryKeys.adminDeployment.run(),
    queryFn: () => deploymentRepository.getRun(),
    enabled,
    refetchInterval: ({ state }) =>
      state.data?.run?.status === DeploymentRunStatus.COMPLETED
        ? DEPLOYMENT_RUN_POLL_IDLE_MS
        : DEPLOYMENT_RUN_POLL_ACTIVE_MS,
  });

  return { progress: query.data ?? null, isLoading: query.isLoading };
}
