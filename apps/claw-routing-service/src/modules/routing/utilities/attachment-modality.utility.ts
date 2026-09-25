import type { RequiredModality } from '@claw/shared-types';

import {
  KNOWN_REQUIRED_MODALITIES,
  MAX_ATTACHMENT_MIME_TYPE_LENGTH,
  MAX_ATTACHMENT_MIME_TYPES,
} from '../constants/modality-fit.constants';
import type { AttachmentModalityContext } from '../types/modality-fit.types';

/**
 * The attachment half of `message.created` (multimodal batch 8), validated:
 * at most 10 mime types of sane length, and only known modality values. A
 * payload from an older chat-service has none of these fields and yields
 * empty lists — AUTO then ranks exactly as before. Only what is required can
 * be transformable.
 */
export function parseAttachmentModality(
  payload: Record<string, unknown>,
): AttachmentModalityContext {
  const attachmentMimeTypes = stringList(payload['attachmentMimeTypes'])
    .filter((mime) => mime.length > 0 && mime.length <= MAX_ATTACHMENT_MIME_TYPE_LENGTH)
    .slice(0, MAX_ATTACHMENT_MIME_TYPES)
    .map((mime) => mime.toLowerCase());
  const requiredModalities = modalityList(payload['requiredModalities']);
  const transformableModalities = modalityList(payload['transformableModalities']).filter(
    (modality) => requiredModalities.includes(modality),
  );
  return { attachmentMimeTypes, requiredModalities, transformableModalities };
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? (value as unknown[]).filter((item): item is string => typeof item === 'string')
    : [];
}

function modalityList(value: unknown): RequiredModality[] {
  return [
    ...new Set(
      stringList(value).filter((item): item is RequiredModality =>
        KNOWN_REQUIRED_MODALITIES.has(item),
      ),
    ),
  ];
}
