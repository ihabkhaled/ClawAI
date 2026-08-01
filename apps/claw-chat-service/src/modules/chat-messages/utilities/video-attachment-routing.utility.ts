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
  const normalizedModel = payload.selectedModel.trim().toLowerCase();
  if (normalizedProvider !== GEMINI_PROVIDER || !GEMINI_VIDEO_CAPABLE_MODELS.has(normalizedModel)) {
    throw new BusinessException(
      `The selected provider/model ${payload.selectedProvider}/${payload.selectedModel} cannot process video attachments. Choose Gemini/gemini-2.5-flash, Gemini/gemini-2.5-pro, or use Auto.`,
      'VIDEO_ATTACHMENT_PROVIDER_UNSUPPORTED',
      undefined,
      'chat.errors.videoAttachmentProviderUnsupported',
    );
  }

  return [{ provider: GEMINI_PROVIDER, model: normalizedModel }];
}
