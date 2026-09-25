import { ModelCapabilityBadge } from '@/enums/model-capability-badge.enum';
import type { ConnectorModel } from '@/types/connector.types';
import type { ModelMediaCapabilities } from '@/types/media-recording.types';

/**
 * Can the composer record a voice note / a video note right now?
 *
 * Neither answer depends on the selected chat model (ADR-120 batch 10):
 *
 * - **Audio** is always transcribed out of band and handed to the model as a
 *   transcript framed as speech, so a voice note works with Claude as well as
 *   with Gemini. The mic dims only when the catalog positively says nothing can
 *   transcribe: the list has rows and none carries `supportsAudio`. An empty or
 *   unavailable list is UNKNOWN and stays enabled — a control dimmed for no
 *   visible reason reads as a broken app; a server-side refusal explains itself.
 * - **Video** is processed for any model (native on video-capable Gemini, else
 *   frames + transcript). The camera dims only when the plan says video is
 *   disabled: `maxVideoSeconds === 0`. `null` is unlimited, and an absent value
 *   (older auth-service, entitlements still loading) is unknown — enabled.
 */
export function resolveMediaCapabilities(
  models: readonly ConnectorModel[],
  maxVideoSeconds: number | null | undefined,
): ModelMediaCapabilities {
  return {
    canSendAudio: models.length === 0 || models.some((row) => row.supportsAudio !== false),
    canSendVideo: maxVideoSeconds !== 0,
  };
}

/**
 * The capability badges for one connector catalog row, in display order.
 * Only a flag that is literally `true` on THIS row earns a badge.
 */
export function getConnectorModelCapabilityBadges(
  row: Pick<ConnectorModel, 'supportsVision' | 'supportsAudio' | 'supportsVideoInput'>,
): ModelCapabilityBadge[] {
  const badges: ModelCapabilityBadge[] = [];
  if (row.supportsVision === true) {
    badges.push(ModelCapabilityBadge.Vision);
  }
  if (row.supportsAudio === true) {
    badges.push(ModelCapabilityBadge.AudioInput);
  }
  if (row.supportsVideoInput === true) {
    badges.push(ModelCapabilityBadge.VideoInput);
  }
  return badges;
}
