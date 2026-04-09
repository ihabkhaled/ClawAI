import { useMemo } from 'react';

import { useAllModels } from '@/hooks/connectors/use-all-models';
import { useLocalModels } from '@/hooks/ollama/use-local-models';
import type { GroupedModels, ModelSelection } from '@/types';

const PROVIDER_LABELS: Record<string, string> = {
  'local-ollama': 'Ollama (Local)',
  OLLAMA: 'Ollama (Connector)',
  OPENAI: 'OpenAI',
  ANTHROPIC: 'Anthropic',
  GEMINI: 'Google Gemini',
  DEEPSEEK: 'DeepSeek',
  AWS_BEDROCK: 'AWS Bedrock',
};

export function useAvailableModels(): {
  groupedModels: GroupedModels[];
  isLoading: boolean;
} {
  const { models, isLoading: isLoadingCloud } = useAllModels();
  const { models: localModels, isLoading: isLoadingLocal } = useLocalModels();

  const groupedModels = useMemo((): GroupedModels[] => {
    const groups = new Map<string, ModelSelection[]>();

    // Add local Ollama models first
    for (const model of localModels) {
      if (!model.isInstalled) {
        continue;
      }
      const provider = 'local-ollama';
      const existing = groups.get(provider) ?? [];
      const fullModelName =
        model.tag && model.tag !== 'latest' ? `${model.name}:${model.tag}` : model.name;
      existing.push({
        provider,
        model: fullModelName,
        displayName: `${fullModelName} (${model.family ?? 'local'})`,
      });
      groups.set(provider, existing);
    }

    // Add cloud connector models
    for (const model of models) {
      const provider = model.provider;
      const existing = groups.get(provider) ?? [];
      existing.push({
        provider,
        model: model.modelKey,
        displayName: model.displayName || model.modelKey,
      });
      groups.set(provider, existing);
    }

    const result: GroupedModels[] = [];
    for (const [provider, providerModels] of groups) {
      result.push({
        provider,
        label: PROVIDER_LABELS[provider] ?? provider,
        models: providerModels.sort((a, b) => a.displayName.localeCompare(b.displayName)),
      });
    }

    // Sort: local-ollama first, then alphabetically
    result.sort((a, b) => {
      if (a.provider === 'local-ollama') {
        return -1;
      }
      if (b.provider === 'local-ollama') {
        return 1;
      }
      return a.label.localeCompare(b.label);
    });

    return result;
  }, [models, localModels]);

  return { groupedModels, isLoading: isLoadingCloud || isLoadingLocal };
}
