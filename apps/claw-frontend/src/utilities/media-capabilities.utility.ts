import { ModelCapabilityBadge } from '@/enums/model-capability-badge.enum';
import type { ConnectorModel } from '@/types/connector.types';
import type { ModelMediaCapabilities } from '@/types/media-recording.types';
import { isAudioOutputModel, isImageOutputModel } from '@/utilities/image-output-model.utility';
import { isVideoOutputModel } from '@/utilities/video-generation.utility';

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
  row: Pick<ConnectorModel, 'supportsVision' | 'supportsAudio' | 'supportsVideoInput'> &
    Partial<Pick<ConnectorModel, 'provider' | 'modelKey' | 'mediaKind'>>,
): ModelCapabilityBadge[] {
  const badges: ModelCapabilityBadge[] = [];
  // A speech or music model reads text only, whatever the sync's capability guess says.
  const audioOutput =
    row.mediaKind === 'AUDIO' || (row.modelKey !== undefined && isAudioOutputModel(row.modelKey));
  if (row.supportsVision === true && !audioOutput) {
    badges.push(ModelCapabilityBadge.Vision);
  }
  if (row.supportsAudio === true) {
    badges.push(ModelCapabilityBadge.AudioInput);
  }
  if (row.supportsVideoInput === true && !audioOutput) {
    badges.push(ModelCapabilityBadge.VideoInput);
  }
  // Image-OUTPUT models (Gemini *-image*, nano-banana, Grok Imagine, GPT Image):
  // the same CHAT-row situation as video, so they are recognised by model id.
  if (
    row.mediaKind === 'IMAGE' ||
    (row.provider !== undefined &&
      row.modelKey !== undefined &&
      isImageOutputModel(row.provider, row.modelKey))
  ) {
    badges.push(ModelCapabilityBadge.ImageOutput);
  }
  // Video-OUTPUT models (Veo, Grok Imagine Video) are ordinary CHAT rows in the
  // catalog with no flag of their own, so they are recognised by model id.
  if (
    row.mediaKind === 'VIDEO' ||
    (row.provider !== undefined &&
      row.modelKey !== undefined &&
      isVideoOutputModel(row.provider, row.modelKey))
  ) {
    badges.push(ModelCapabilityBadge.VideoOutput);
  }
  if (audioOutput) {
    badges.push(ModelCapabilityBadge.AudioOutput);
  }
  return badges;
}
