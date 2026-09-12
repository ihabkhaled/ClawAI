import { useMemo } from 'react';

import { useAvailableConnectorModels } from '@/hooks/chat/use-available-connector-models';
import { useLocalModels } from '@/hooks/ollama/use-local-models';
import type { JudgeModelOption } from '@/types';
import { compareModelsByRecency } from '@/utilities/model-recency.utility';

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
    const local = localModels
      .filter((m) => m.isInstalled && !m.roles.some((r) => r.role === 'ROUTER' && r.isActive))
      .map((m) => {
        const fullName = m.tag && m.tag !== 'latest' ? `${m.name}:${m.tag}` : m.name;
        return {
          option: { value: fullName, label: fullName },
          sortable: { provider: 'local-ollama', model: fullName, displayName: fullName },
        };
      });

    const cloud = cloudModels.map((m) => ({
      option: {
        value: `${m.provider}:${m.modelKey}`,
        label: `${m.provider} · ${m.displayName || m.modelKey}`,
      },
      sortable: {
        provider: m.provider,
        model: m.modelKey,
        displayName: m.displayName || m.modelKey,
      },
    }));

    // Newest first, via the SAME comparator the model picker and the public
    // pages use. This list was still on localeCompare after the others moved,
    // so the judge dropdown offered GPT 3.5 Turbo at the top while every other
    // model list in the product led with GPT 5.6.
    return [...local, ...cloud]
      .sort((a, b) => compareModelsByRecency(a.sortable, b.sortable))
      .map((entry) => entry.option);
  }, [localModels, cloudModels]);

  return { options, isLoading: isLoadingLocal || isLoadingCloud };
}
