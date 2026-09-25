import { bareModelKey } from '@claw/shared-utilities';

import {
  GEMINI_PROVIDER,
  GEMINI_VIDEO_CAPABLE_MODELS,
  LOCAL_ONLY_ROUTING_MODES,
  VIDEO_MIME_PREFIX,
} from '../../../common/constants';
import { MediaCapabilityState } from '../../../common/enums/media-capability-state.enum';
import type { AssembledContext } from '../types/context.types';
import type { MessageRoutedData } from '../types/execution.types';
import type { VideoRoutingCapability } from '../types/model-capability.types';

export function hasVideoAttachment(context: AssembledContext): boolean {
  return context.fileContents.some((file) => file.mimeType.startsWith(VIDEO_MIME_PREFIX));
}

/**
 * Where a turn carrying a video may run.
 *
 * Before multimodal batch 8 this threw for every model that could not take
 * video bytes, and forced AUTO onto a hardcoded Gemini model. It no longer
 * refuses or overrides anyone: a model that cannot watch the video natively
 * receives its timestamped transcript and sampled frames
 * (VIDEO_FRAMES_AND_TRANSCRIPT, resolved per lane at the execution
 * chokepoint), and every other video state — still processing, failed, plan
 * limit — has an honest delivery of its own. There is no longer a turn with
 * "no safe route", so the chain is never emptied here.
 *
 *   - AUTO, LOCAL_ONLY, PRIVACY_FIRST, and a manual pick of any model that
 *     cannot take video natively → the chain exactly as routed. AUTO's
 *     preference for a video-capable model is routing-service's job now
 *     (modality-fit ranking, rule 51 item 13), where exposure, health and the
 *     plan are respected — forcing a Gemini model here bypassed all three.
 *     LOCAL_ONLY / PRIVACY_FIRST never reach a cloud model: the local lane
 *     gets the transcript, and frames through a LOCAL helper only.
 *   - A manual pick of a video-capable Gemini model → that model, natively
 *     (unchanged). Eligibility reads the connector catalog's `VIDEO_INPUT`
 *     flag (ADR-120), with `GEMINI_VIDEO_CAPABLE_MODELS` as the UNKNOWN
 *     fallback, and the catalog's `models/` prefix is normalized (rule 42
 *     item 13) so the id the picker sends is the id that is accepted.
 */
export function resolveVideoAttachmentCandidates(
  payload: MessageRoutedData,
  context: AssembledContext,
  candidates: Array<{ provider: string; model: string }>,
  capability?: VideoRoutingCapability,
): Array<{ provider: string; model: string }> {
  if (
    !hasVideoAttachment(context) ||
    payload.routingMode === 'AUTO' ||
    LOCAL_ONLY_ROUTING_MODES.has(payload.routingMode)
  ) {
    return candidates;
  }
  const normalizedProvider = payload.selectedProvider.trim().toUpperCase();
  // The connector catalog keys Gemini models with a `models/` prefix and the
  // frontend passes that id straight through; the shared normalizer makes
  // `models/gemini-2.5-flash` and `gemini-2.5-flash` the same model here too.
  const normalizedModel = bareModelKey(payload.selectedModel);
  return selectedModelAcceptsVideo(normalizedProvider, normalizedModel, capability)
    ? [{ provider: GEMINI_PROVIDER, model: normalizedModel }]
    : candidates;
}

function selectedModelAcceptsVideo(
  provider: string,
  model: string,
  capability: VideoRoutingCapability | undefined,
): boolean {
  if (provider !== GEMINI_PROVIDER) {
    return false;
  }
  const selected = capability?.selected ?? MediaCapabilityState.UNKNOWN;
  return selected !== MediaCapabilityState.UNKNOWN
    ? selected === MediaCapabilityState.SUPPORTED
    : GEMINI_VIDEO_CAPABLE_MODELS.has(model);
}
