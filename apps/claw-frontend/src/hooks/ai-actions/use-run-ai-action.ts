import { useMutation } from '@tanstack/react-query';

import type { RunAiActionBody } from '@/repositories/ai-actions/ai-actions.repository';
import { runAiAction } from '@/repositories/ai-actions/ai-actions.repository';
import type { AiActionResult, UseRunAiActionResult } from '@/types/ai-action.types';

export function useRunAiAction(): UseRunAiActionResult {
  const mutation = useMutation<AiActionResult, Error, RunAiActionBody>({
    mutationFn: (body) => runAiAction(body),
  });
  return {
    result: mutation.data ?? null,
    run: (body) => mutation.mutate(body),
    reset: () => mutation.reset(),
    isPending: mutation.isPending,
    error: (mutation.error as Error | null) ?? null,
  };
}
