import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { pullModelSchema } from '@/lib/validation/ollama.schema';
import { ollamaRepository } from '@/repositories/ollama/ollama.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { FormFieldErrors } from '@/types';

import { useAssignRole } from './use-assign-role';
import { useLocalModels } from './use-local-models';
import { usePullModel } from './use-pull-model';

export function useLocalModelsPage() {
  const [pullModelName, setPullModelName] = useState('');
  const [pullRuntime, setPullRuntime] = useState('');
  const [pullFieldErrors, setPullFieldErrors] = useState<FormFieldErrors>({});

  const { models, isLoading, isError, error } = useLocalModels();
  const { pullModel, isPending: isPullPending } = usePullModel();
  const { assignRole, isPending: isAssignPending } = useAssignRole();

  // Ollama is an OPTIONAL local runtime; a deployment without it answers 502 on
  // every call, so these must opt out of the app-wide 10s refetchInterval
  // default (providers.tsx) or they poll a permanently-502ing endpoint forever.
  const runtimesQuery = useQuery({
    queryKey: queryKeys.runtimes.all,
    queryFn: () => ollamaRepository.getRuntimes(),
    retry: false,
    refetchInterval: false,
  });

  const healthQuery = useQuery({
    queryKey: ['ollama', 'health'] as const,
    queryFn: () => ollamaRepository.getHealth(),
    retry: false,
    refetchInterval: (q) => (q.state.status === 'error' ? false : 30000),
  });

  const runtimes = runtimesQuery.data ?? [];

  const handlePullModel = useCallback((): void => {
    const formData = {
      modelName: pullModelName.trim(),
      runtime: pullRuntime,
    };

    const result = pullModelSchema.safeParse(formData);
    if (!result.success) {
      setPullFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    setPullFieldErrors({});
    pullModel(
      { modelName: result.data.modelName, runtime: result.data.runtime },
      {
        onSuccess: () => {
          setPullModelName('');
          setPullRuntime('');
        },
      },
    );
  }, [pullModelName, pullRuntime, pullModel]);

  const handleAssignRole = useCallback(
    (modelId: string, role: string): void => {
      assignRole({ modelId, role });
    },
    [assignRole],
  );

  const clearPullFieldErrors = useCallback((): void => {
    setPullFieldErrors({});
  }, []);

  return {
    models,
    isLoading,
    isError,
    error,
    runtimes,
    isRuntimesLoading: runtimesQuery.isLoading,
    healthStatus: healthQuery.data?.status ?? null,
    healthRuntime: healthQuery.data?.runtime ?? null,
    healthLatency: healthQuery.data?.latencyMs ?? null,
    pullModelName,
    setPullModelName,
    pullRuntime,
    setPullRuntime,
    handlePullModel,
    isPullPending,
    pullFieldErrors,
    clearPullFieldErrors,
    handleAssignRole,
    isAssignPending,
  };
}
