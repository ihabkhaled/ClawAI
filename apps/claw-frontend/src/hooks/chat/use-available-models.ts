import { useMemo } from 'react';

import { FrontierDownloadStatus } from '@/enums/local-frontier.enum';
import { useAllModels } from '@/hooks/connectors/use-all-models';
import { useFrontierCatalog } from '@/hooks/local-frontier/use-frontier-catalog';
import { useLocalModels } from '@/hooks/ollama/use-local-models';
import type { GroupedModels, ModelSelection } from '@/types';
import { getLocalModelSpecificationLabels } from '@/utilities';

const PROVIDER_LABELS: Record<string, string> = {
  'local-ollama': 'Ollama (Local)',
  'local-llamacpp': 'llama.cpp Frontier (Local)',
  OLLAMA: 'Ollama (Connector)',
  OPENAI: 'OpenAI',
  ANTHROPIC: 'Anthropic',
  GEMINI: 'Google Gemini',
  DEEPSEEK: 'DeepSeek',
  AWS_BEDROCK: 'AWS Bedrock',
  LLAMACPP: 'llama.cpp (Connector)',
  IMAGE_OPENAI: 'OpenAI (Image)',
  IMAGE_GEMINI: 'Gemini (Image)',
  IMAGE_LOCAL: 'Local (Image)',
};

export function useAvailableModels(): {
  groupedModels: GroupedModels[];
  isLoading: boolean;
} {
  const { models, isLoading: isLoadingCloud } = useAllModels();
  const { models: localModels, isLoading: isLoadingLocal } = useLocalModels();
  const frontierQuery = useFrontierCatalog({ limit: 100 });
  const frontierEntries = useMemo(() => frontierQuery.data?.data ?? [], [frontierQuery.data?.data]);

  const groupedModels = useMemo((): GroupedModels[] => {
    const groups = new Map<string, ModelSelection[]>();
    const localModelNames = new Set<string>();

    // Add local Frontier (llama.cpp) models that are downloaded locally.
    for (const entry of frontierEntries) {
      if (entry.downloadStatus !== FrontierDownloadStatus.READY) {
        continue;
      }
      const provider = 'local-llamacpp';
      const fullModelName = `${entry.name}:${entry.tag}`;
      const existing = groups.get(provider) ?? [];
      existing.push({
        provider,
        model: fullModelName,
        displayName: `${entry.displayName} (${entry.parameterCount})`,
      });
      groups.set(provider, existing);
    }

    // Add local Ollama models first.
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
        specifications: getLocalModelSpecificationLabels(model),
      });
      localModelNames.add(fullModelName);
      localModelNames.add(`${model.name}:${model.tag}`);
      localModelNames.add(model.name);
      groups.set(provider, existing);
    }

    // Add connector models while keeping local downloaded Ollama entries in the local section only.
    for (const model of models) {
      if (model.provider === 'OLLAMA' && localModelNames.has(model.modelKey)) {
        continue;
      }
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

    result.push({
      provider: 'IMAGE_OPENAI',
      label: PROVIDER_LABELS['IMAGE_OPENAI'] ?? 'OpenAI (Image)',
      models: [{ provider: 'IMAGE_OPENAI', model: 'dall-e-3', displayName: 'DALL-E 3' }],
    });
    result.push({
      provider: 'IMAGE_GEMINI',
      label: PROVIDER_LABELS['IMAGE_GEMINI'] ?? 'Gemini (Image)',
      models: [
        {
          provider: 'IMAGE_GEMINI',
          model: 'gemini-2.5-flash-image',
          displayName: 'Gemini 2.5 Flash Image',
        },
      ],
    });
    result.push({
      provider: 'IMAGE_LOCAL',
      label: PROVIDER_LABELS['IMAGE_LOCAL'] ?? 'Local (Image)',
      models: [{ provider: 'IMAGE_LOCAL', model: 'sdxl-turbo', displayName: 'SDXL Turbo (Local)' }],
    });

    result.sort((a, b) => {
      if (a.provider === 'local-ollama') {
        return -1;
      }
      if (b.provider === 'local-ollama') {
        return 1;
      }
      if (a.provider === 'local-llamacpp') {
        return -1;
      }
      if (b.provider === 'local-llamacpp') {
        return 1;
      }
      return a.label.localeCompare(b.label);
    });

    return result;
  }, [models, localModels, frontierEntries]);

  return {
    groupedModels,
    isLoading: isLoadingCloud || isLoadingLocal || frontierQuery.isLoading,
  };
}
