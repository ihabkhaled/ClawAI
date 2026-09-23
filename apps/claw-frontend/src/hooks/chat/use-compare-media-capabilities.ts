'use client';

import { useMemo } from 'react';

import { useAvailableConnectorModels } from '@/hooks/chat/use-available-connector-models';
import type { ModelMediaCapabilities, ParallelModelTarget } from '@/types';

/**
 * Recorder capability gating for Compare, which picks MANY models at once.
 *
 * `useModelMediaCapabilities` takes a single `ModelSelection`, so it cannot
 * answer this question — Compare holds a `ParallelModelTarget[]`. This is the
 * multi-model sibling and it keeps the same catalog rules:
 *
 *   - `supportsAudio` / `supportsVision` come from the connector catalog; a
 *     model that is not a catalog row at all (local Ollama, llama.cpp) or a
 *     row that predates the flag counts as CAPABLE, never as blocked.
 *   - No models picked yet: both enabled, same as the `null` case there.
 *
 * DECISION — enabled unless EVERY selected model positively lacks it.
 * One recording is sent to every lane, so the control is only useless when no
 * lane could read it. Gating on ALL models (the "dim unless everyone
 * supports it") reading would let one text-only model in a five-model compare
 * silently remove voice notes from the other four, which is the worse
 * failure: the user sees a dimmed button and no reason for it. A lane whose
 * model cannot take the media still reports that per-lane, through the same
 * `attachmentDelivery` path an unreadable attachment already uses.
 */
export function useCompareMediaCapabilities(
  selectedModels: ParallelModelTarget[],
): ModelMediaCapabilities {
  const { models } = useAvailableConnectorModels();

  return useMemo((): ModelMediaCapabilities => {
    if (selectedModels.length === 0) {
      return { canSendAudio: true, canSendVideo: true };
    }
    const rows = selectedModels.map((target) =>
      models.find((model) => model.modelKey === target.model && model.provider === target.provider),
    );
    return {
      canSendAudio: rows.some((row) => row === undefined || row.supportsAudio !== false),
      canSendVideo: rows.some((row) => row === undefined || row.supportsVision !== false),
    };
  }, [models, selectedModels]);
}
