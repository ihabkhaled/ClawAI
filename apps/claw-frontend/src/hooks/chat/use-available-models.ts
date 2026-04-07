import { useMemo } from 'react';

import { useAllModels } from '@/hooks/connectors/use-all-models';
import type { ModelSelection } from '@/types';

type GroupedModels = {
  provider: string;
  label: string;
  models: ModelSelection[];
};

const PROVIDER_LABELS: Record<string, string> = {
  OLLAMA: 'Ollama (Local)',
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
  const { models, isLoading } = useAllModels();

  const groupedModels = useMemo((): GroupedModels[] => {
    const groups = new Map<string, ModelSelection[]>();

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

    // Sort: Ollama first, then alphabetically
    result.sort((a, b) => {
      if (a.provider === 'OLLAMA') return -1;
      if (b.provider === 'OLLAMA') return 1;
      return a.label.localeCompare(b.label);
    });

    return result;
  }, [models]);

  return { groupedModels, isLoading };
}
