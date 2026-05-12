import type { UseMutationResult } from '@tanstack/react-query';

import type { RouterModel, UpdateRouterModelMutationVars } from './router-models.types';

export type UseUpdateRouterModelResult = {
  mutation: UseMutationResult<RouterModel, Error, UpdateRouterModelMutationVars>;
  pendingId: string | null;
  mutationError: Error | null;
  reset: () => void;
};
