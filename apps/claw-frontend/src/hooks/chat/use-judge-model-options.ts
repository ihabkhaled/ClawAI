import { useMemo } from 'react';

import { useAvailableConnectorModels } from '@/hooks/chat/use-available-connector-models';
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
  // Use the USER-facing connector catalog endpoint (MODEL_USE_ALLOWED), NOT
  // the admin connectors list — otherwise normal users get only local models
  // in the judge picker even though the backend now accepts any cloud judge.
  const { models: cloudModels, isLoading: isLoadingCloud } = useAvailableConnectorModels();

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
