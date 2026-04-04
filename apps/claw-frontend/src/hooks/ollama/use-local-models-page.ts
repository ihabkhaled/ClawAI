import { useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { ollamaRepository } from "@/repositories/ollama/ollama.repository";
import { queryKeys } from "@/repositories/shared/query-keys";

import { useLocalModels } from "./use-local-models";
import { usePullModel } from "./use-pull-model";
import { useAssignRole } from "./use-assign-role";

export function useLocalModelsPage() {
  const [pullModelName, setPullModelName] = useState("");
  const [pullRuntime, setPullRuntime] = useState("");

  const { models, isLoading, isError, error } = useLocalModels();
  const { pullModel, isPending: isPullPending } = usePullModel();
  const { assignRole, isPending: isAssignPending } = useAssignRole();

  const runtimesQuery = useQuery({
    queryKey: queryKeys.runtimes.all,
    queryFn: () => ollamaRepository.getRuntimes(),
  });

  const healthQuery = useQuery({
    queryKey: ["ollama", "health"] as const,
    queryFn: () => ollamaRepository.getHealth(),
    refetchInterval: 30000,
  });

  const runtimes = runtimesQuery.data ?? [];

  const handlePullModel = () => {
    if (!pullModelName.trim() || !pullRuntime) return;
    pullModel(
      { modelName: pullModelName.trim(), runtime: pullRuntime },
      {
        onSuccess: () => {
          setPullModelName("");
          setPullRuntime("");
        },
      },
    );
  };

  const handleAssignRole = (modelId: string, role: string) => {
    assignRole({ modelId, role });
  };

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
    handleAssignRole,
    isAssignPending,
  };
}
