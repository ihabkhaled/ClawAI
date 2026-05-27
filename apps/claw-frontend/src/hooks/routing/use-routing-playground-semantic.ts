import { useMutation } from '@tanstack/react-query';

import { routingRepository } from '@/repositories/routing/routing.repository';
import type {
  AnalyzeSemanticVariables,
  SemanticIntentAnalysisRecord,
} from '@/types';

export function useRoutingPlaygroundSemantic(): {
  mutate: (variables: AnalyzeSemanticVariables) => void;
  reset: () => void;
  data: SemanticIntentAnalysisRecord | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
} {
  const mutation = useMutation<SemanticIntentAnalysisRecord, Error, AnalyzeSemanticVariables>({
    mutationFn: (variables) => routingRepository.analyzeSemantic(variables),
  });

  return {
    mutate: mutation.mutate,
    reset: mutation.reset,
    data: mutation.data,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: (mutation.error as Error | null) ?? null,
  };
}
