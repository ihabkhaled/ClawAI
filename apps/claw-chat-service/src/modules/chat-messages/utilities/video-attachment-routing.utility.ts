import { bareModelKey, modelMatchKey } from '@claw/shared-utilities';

import {
  GEMINI_PROVIDER,
  GEMINI_VIDEO_CAPABLE_MODELS,
  GEMINI_VIDEO_DEFAULT_MODEL,
  LOCAL_ONLY_ROUTING_MODES,
  VIDEO_MIME_PREFIX,
} from '../../../common/constants';
import { MediaCapabilityState } from '../../../common/enums/media-capability-state.enum';
import { BusinessException } from '../../../common/errors';
import type { AssembledContext } from '../types/context.types';
import type { MessageRoutedData } from '../types/execution.types';
import type { MediaCapableModel, VideoRoutingCapability } from '../types/model-capability.types';

export function hasVideoAttachment(context: AssembledContext): boolean {
  return context.fileContents.some((file) => file.mimeType.startsWith(VIDEO_MIME_PREFIX));
}

/**
 * Where a turn carrying a video may run.
 *
 * Eligibility comes from the connector catalog's per-model `VIDEO_INPUT` flag
 * (`capability`, ADR-120), not from a hardcoded list. Only a model that
 * accepts video AND sits on a transport that carries video bytes qualifies —
 * today that transport is Gemini's native request, so a non-Gemini row is not
 * offered even if the catalog ever flags one.
 *
 * When the catalog cannot answer (`capability` absent, `selected` UNKNOWN, or
 * no snapshot), the documented static `GEMINI_VIDEO_CAPABLE_MODELS` set
 * decides, exactly as before, so a catalog outage never breaks a video turn
 * that used to work.
 *
 * The suggested alternatives are built from the SAME data the rejection just
 * consulted, and never include the rejected model (rule 42 item 13).
 */
export function resolveVideoAttachmentCandidates(
  payload: MessageRoutedData,
  context: AssembledContext,
  candidates: Array<{ provider: string; model: string }>,
  capability?: VideoRoutingCapability,
): Array<{ provider: string; model: string }> {
  if (!hasVideoAttachment(context)) {
    return candidates;
  }

  if (LOCAL_ONLY_ROUTING_MODES.has(payload.routingMode)) {
    throw new BusinessException(
      `Video attachments cannot be processed in ${payload.routingMode} mode because no local video-capable model is configured.`,
      'VIDEO_ATTACHMENT_LOCAL_MODEL_UNAVAILABLE',
      undefined,
      'chat.errors.videoAttachmentLocalModelUnavailable',
    );
  }

  const capable = videoCapableModels(capability);

  if (payload.routingMode === 'AUTO') {
    return [pickAutoVideoModel(capable)];
  }

  const normalizedProvider = payload.selectedProvider.trim().toUpperCase();
  // The connector catalog keys Gemini models with a `models/` prefix and the
  // frontend passes that id straight through; the shared normalizer makes
  // `models/gemini-2.5-flash` and `gemini-2.5-flash` the same model here too.
  const normalizedModel = bareModelKey(payload.selectedModel);
  if (!selectedModelAcceptsVideo(normalizedProvider, normalizedModel, capability)) {
    const rejectedKey = modelMatchKey(normalizedProvider, normalizedModel);
    const suggestions = capable
      .filter((model) => modelMatchKey(model.provider, model.model) !== rejectedKey)
      .map((model) => `${formatProviderName(model.provider)}/${model.model}`)
      .join(', ');
    throw new BusinessException(
      `The selected provider/model ${payload.selectedProvider}/${payload.selectedModel} cannot process video attachments. ${suggestions.length > 0 ? `Choose ${suggestions}, or use Auto.` : 'Use Auto.'}`,
      'VIDEO_ATTACHMENT_PROVIDER_UNSUPPORTED',
      undefined,
      'chat.errors.videoAttachmentProviderUnsupported',
    );
  }

  return [{ provider: GEMINI_PROVIDER, model: normalizedModel }];
}

/**
 * The models a video turn may use: the catalog's video-capable Gemini chat
 * models when the catalog answered with at least one, else the static set.
 */
function videoCapableModels(capability: VideoRoutingCapability | undefined): MediaCapableModel[] {
  const fromCatalog = (capability?.capableModels ?? []).filter(
    (model) => model.provider.toUpperCase() === GEMINI_PROVIDER,
  );
  return fromCatalog.length > 0
    ? fromCatalog
    : [...GEMINI_VIDEO_CAPABLE_MODELS].map((model) => ({ provider: GEMINI_PROVIDER, model }));
}

function pickAutoVideoModel(capable: MediaCapableModel[]): { provider: string; model: string } {
  const preferred = capable.find((model) => model.model === GEMINI_VIDEO_DEFAULT_MODEL);
  const chosen = preferred ?? capable.at(0);
  return { provider: GEMINI_PROVIDER, model: chosen?.model ?? GEMINI_VIDEO_DEFAULT_MODEL };
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

function formatProviderName(provider: string): string {
  const upper = provider.toUpperCase();
  return `${upper.slice(0, 1)}${upper.slice(1).toLowerCase()}`;
}
