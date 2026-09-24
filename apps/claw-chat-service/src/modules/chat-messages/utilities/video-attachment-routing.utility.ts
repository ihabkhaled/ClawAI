import {
  GEMINI_PROVIDER,
  GEMINI_VIDEO_CAPABLE_MODELS,
  GEMINI_VIDEO_DEFAULT_MODEL,
  LOCAL_ONLY_ROUTING_MODES,
  VIDEO_MIME_PREFIX,
} from '../../../common/constants';
import { BusinessException } from '../../../common/errors';
import type { AssembledContext } from '../types/context.types';
import type { MessageRoutedData } from '../types/execution.types';

export function hasVideoAttachment(context: AssembledContext): boolean {
  return context.fileContents.some((file) => file.mimeType.startsWith(VIDEO_MIME_PREFIX));
}

export function resolveVideoAttachmentCandidates(
  payload: MessageRoutedData,
  context: AssembledContext,
  candidates: Array<{ provider: string; model: string }>,
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

  if (payload.routingMode === 'AUTO') {
    return [{ provider: GEMINI_PROVIDER, model: GEMINI_VIDEO_DEFAULT_MODEL }];
  }

  const normalizedProvider = payload.selectedProvider.trim().toUpperCase();
  // The connector catalog keys Gemini models with a `models/` prefix (see
  // `image-generation-target.constants.ts`), and the frontend passes that
  // catalog id straight through as `selectedModel`. Stripping the optional
  // prefix here keeps this check aligned with the same model id shape the
  // rest of chat-service already normalizes — without it, a real
  // video-capable model such as `models/gemini-2.5-flash` never matches
  // `GEMINI_VIDEO_CAPABLE_MODELS` (which is keyed bare) and gets rejected
  // while being simultaneously recommended as the fix.
  const normalizedModel = payload.selectedModel
    .trim()
    .toLowerCase()
    .replace(/^models\//u, '');
  if (normalizedProvider !== GEMINI_PROVIDER || !GEMINI_VIDEO_CAPABLE_MODELS.has(normalizedModel)) {
    // The suggestion list is derived from the same `GEMINI_VIDEO_CAPABLE_MODELS`
    // set the check above just consulted, so the rejection and the recommended
    // alternatives can never disagree — a model this function rejects can
    // never also appear as its own suggested fix.
    const suggestions = [...GEMINI_VIDEO_CAPABLE_MODELS]
      .map((model) => `${GEMINI_PROVIDER[0]}${GEMINI_PROVIDER.slice(1).toLowerCase()}/${model}`)
      .join(', ');
    throw new BusinessException(
      `The selected provider/model ${payload.selectedProvider}/${payload.selectedModel} cannot process video attachments. Choose ${suggestions}, or use Auto.`,
      'VIDEO_ATTACHMENT_PROVIDER_UNSUPPORTED',
      undefined,
      'chat.errors.videoAttachmentProviderUnsupported',
    );
  }

  return [{ provider: GEMINI_PROVIDER, model: normalizedModel }];
}
