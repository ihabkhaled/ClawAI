import { useMutation } from '@tanstack/react-query';

import { resolveAiAction } from '@/repositories/ai-actions/ai-actions.repository';
import type {
  AutoRouterResolution,
  ResolveAiActionRequest,
  UseResolveAiActionResult,
} from '@/types/ai-action.types';

export function useResolveAiAction(): UseResolveAiActionResult {
  const mutation = useMutation<AutoRouterResolution, Error, ResolveAiActionRequest>({
    mutationFn: (request) => resolveAiAction(request),
  });
  return {
    resolution: mutation.data ?? null,
    resolve: (request) => mutation.mutate(request),
    isPending: mutation.isPending,
    error: (mutation.error as Error | null) ?? null,
  };
}
