'use client';

import { useMemo } from 'react';

import { useAvailableConnectorModels } from '@/hooks/chat/use-available-connector-models';
import { useEntitlements } from '@/hooks/plans/use-entitlements';
import type { ModelMediaCapabilities } from '@/types/media-recording.types';
import { resolveMediaCapabilities } from '@/utilities/media-capabilities.utility';

/**
 * Whether the composer's recorder may produce a voice note / a video note.
 *
 * NOT a question about the selected chat model any more. Every chat model can
 * take a voice note — audio is transcribed out of band and the transcript is
 * framed as speech — and every model can take a video: natively on a
 * video-capable Gemini (`supportsVideoInput`, the catalog's own video flag),
 * otherwise as sampled frames plus transcript. So:
 *
 * - the mic follows transcription availability across the whole catalog;
 * - the camera follows the plan's `maxVideoSeconds` (0 = disabled, ADR-122).
 *
 * The plan is read through `useEntitlements`, the same cached query the rest
 * of the composer already uses — no second fetch. One hook serves the chat
 * composer, the nine labs and both Compare surfaces: the answer is the same
 * whichever and however many models are picked.
 *
 * Unknown means ENABLED — see `resolveMediaCapabilities`.
 */
export function useModelMediaCapabilities(): ModelMediaCapabilities {
  const { models } = useAvailableConnectorModels();
  const { entitlements } = useEntitlements();
  const maxVideoSeconds = entitlements?.plan?.limits.maxVideoSeconds;

  return useMemo(
    () => resolveMediaCapabilities(models, maxVideoSeconds),
    [models, maxVideoSeconds],
  );
}
