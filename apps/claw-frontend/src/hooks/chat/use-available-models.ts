import { useMemo } from 'react';

import { IMAGE_CAPABILITIES } from '@/constants/image.constants';
import { FrontierDownloadStatus } from '@/enums/local-frontier.enum';
import { useAvailableConnectorModels } from '@/hooks/chat/use-available-connector-models';
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
  const { models, isLoading: isLoadingCloud } = useAvailableConnectorModels();
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

    // Image generation is offered only where it can actually run.
    //
    // These three used to be pushed unconditionally, so the composer advertised
    // "Gemini (Image)" and "DALL-E 3" on an install with no Google or OpenAI
    // connector, and "SDXL Turbo (Local)" with no local image runtime deployed
    // — the local-ai compose profile is opt-in. Picking any of them produced a
    // 403, which reads as a broken product rather than as a missing connector.
    //
    // Each image capability borrows the credentials of a chat connector, so the
    // presence of that connector's models is the signal: it is the same
    // credential image-service will resolve when the request arrives.
    for (const image of IMAGE_CAPABILITIES) {
      if (!groups.has(image.requiresConnector)) {
        continue;
      }
      result.push({
        provider: image.provider,
        label: PROVIDER_LABELS[image.provider] ?? image.provider,
        models: [{ provider: image.provider, model: image.model, displayName: image.displayName }],
      });
    }

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
