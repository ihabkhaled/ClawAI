import { useMemo } from 'react';

import { useAllModels } from '@/hooks/connectors/use-all-models';
import { useLocalModels } from '@/hooks/ollama/use-local-models';
import type { JudgeModelOption } from '@/types';

// A judge is a role any text model can perform. Local Ollama models keep their
// plain name as the value (backend resolves them as local). Cloud connector
// models are encoded as `PROVIDER:model` so the backend judge path can route
// them through the normal token-accounted execution (the provider prefix is a
// ConnectorProvider enum value, which disambiguates it from a local `name:tag`).
export function useJudgeModelOptions(): {
  options: JudgeModelOption[];
  isLoading: boolean;
} {
  const { models: localModels, isLoading: isLoadingLocal } = useLocalModels();
  const { models: cloudModels, isLoading: isLoadingCloud } = useAllModels();

  const options = useMemo((): JudgeModelOption[] => {
    const local: JudgeModelOption[] = localModels
      .filter((m) => m.isInstalled && !m.roles.some((r) => r.role === 'ROUTER' && r.isActive))
      .map((m) => {
        const fullName = m.tag && m.tag !== 'latest' ? `${m.name}:${m.tag}` : m.name;
        return { value: fullName, label: fullName };
      });

    const cloud: JudgeModelOption[] = cloudModels.map((m) => ({
      value: `${m.provider}:${m.modelKey}`,
      label: `${m.provider} · ${m.displayName || m.modelKey}`,
    }));

    return [...local, ...cloud].sort((a, b) => (a.label ?? '').localeCompare(b.label ?? ''));
  }, [localModels, cloudModels]);

  return { options, isLoading: isLoadingLocal || isLoadingCloud };
}
