import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/repositories/shared/query-keys';
import { workspaceChainRepository } from '@/repositories/workspace/chain.repository';
import type {
  InstantiateChainTemplateRequest,
  UseInstantiateChainTemplateReturn,
  UseResumeChainRunReturn,
  UseRunChainReturn,
} from '@/types';

export function useInstantiateChainTemplate(): UseInstantiateChainTemplateReturn {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ key, data }: { key: string; data: InstantiateChainTemplateRequest }) =>
      workspaceChainRepository.instantiateTemplate(key, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.workspaceChains.all });
    },
  });
  return {
    mutateAsync: (input) => mutation.mutateAsync(input),
    isPending: mutation.isPending,
    error: mutation.error as Error | null,
  };
}

export function useRunChain(): UseRunChainReturn {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (chainId: string) => workspaceChainRepository.runChain(chainId),
    onSuccess: (_result, chainId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.workspaceChains.runs(chainId) });
    },
  });
  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error as Error | null,
  };
}

export function useResumeChainRun(): UseResumeChainRunReturn {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ chainId, runId }: { chainId: string; runId: string }) =>
      workspaceChainRepository.resumeChainRun(chainId, runId),
    onSuccess: (_result, { chainId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.workspaceChains.runs(chainId) });
    },
  });
  return {
    mutateAsync: (input) => mutation.mutateAsync(input),
    isPending: mutation.isPending,
    error: mutation.error as Error | null,
  };
}
