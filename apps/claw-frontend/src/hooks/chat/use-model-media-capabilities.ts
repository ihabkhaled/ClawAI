'use client';

import { useMemo } from 'react';

import { useAvailableConnectorModels } from '@/hooks/chat/use-available-connector-models';
import type { ModelMediaCapabilities, ModelSelection } from '@/types';

/**
 * What the selected model can be handed, for the composer's recorder controls.
 *
 * The connector catalog (`GET /connectors/available-models`) carries the two
 * flags the provider reported: `supportsAudio` and `supportsVision`. There is
 * no separate video flag anywhere in the stack — native video understanding
 * rides on the vision capability, which is how file-service already routes it.
 *
 * **Unknown means ENABLED, deliberately.** No model picked yet, a local Ollama
 * or llama.cpp model that is not a connector row at all, or a catalog row that
 * predates the flag: in every one of those cases we let the user record. A
 * control dimmed for no visible reason is worse than one that works and then
 * fails with a clear server-side error — the first looks like a broken app,
 * the second tells the user what happened. We only dim when the catalog
 * positively says the model cannot take that media.
 */
export function useModelMediaCapabilities(
  selectedModel: ModelSelection | null,
): ModelMediaCapabilities {
  const { models } = useAvailableConnectorModels();

  return useMemo((): ModelMediaCapabilities => {
    if (selectedModel === null) {
      return { canSendAudio: true, canSendVideo: true };
    }
    const row = models.find(
      (model) =>
        model.modelKey === selectedModel.model && model.provider === selectedModel.provider,
    );
    if (row === undefined) {
      return { canSendAudio: true, canSendVideo: true };
    }
    return {
      canSendAudio: row.supportsAudio !== false,
      canSendVideo: row.supportsVision !== false,
    };
  }, [models, selectedModel]);
}
