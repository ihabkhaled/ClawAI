import { RequiredModality } from '@claw/shared-types';

import {
  ALWAYS_TRANSFORMABLE_MODALITIES,
  MIME_PREFIX_MODALITIES,
  RESEARCH_ATTACHMENT_DIGEST_MAX_CHARS,
  RESEARCH_ATTACHMENT_DIGEST_PER_FILE_CHARS,
} from '../constants/attachment-modality.constants';
import { AUDIO_TRANSCRIPTION_PLACEHOLDER_PREFIX } from '../constants/voice-note.constants';
import {
  IMAGE_FILE_PLACEHOLDER_PREFIX,
  VIDEO_FILE_PLACEHOLDER_PREFIX,
} from '../constants/media-placeholder.constants';
import type { AttachmentModalityFields } from '../types/attachment-modality.types';
import type { FileContentResponse } from '../types/context.types';

/** The non-text inputs these mime types need, in a stable order, no duplicates. */
export function requiredModalitiesForMimeTypes(mimeTypes: readonly string[]): RequiredModality[] {
  const needed = new Set<RequiredModality>();
  for (const mime of mimeTypes) {
    const lower = mime.toLowerCase();
    for (const [prefix, modality] of MIME_PREFIX_MODALITIES) {
      if (lower.startsWith(prefix)) {
        needed.add(modality);
      }
    }
  }
  return Object.values(RequiredModality).filter((modality) => needed.has(modality));
}

/**
 * The `message.created` fields for these attachments. Empty mime types → no
 * fields at all, so a turn without attachments publishes exactly what it did
 * before batch 8 and routing behaves exactly as before.
 */
export function attachmentModalityFields(
  mimeTypes: readonly string[],
  helperVisionOnPlan: boolean,
): AttachmentModalityFields {
  const attachmentMimeTypes = [...new Set(mimeTypes.map((mime) => mime.toLowerCase()))];
  if (attachmentMimeTypes.length === 0) {
    return {};
  }
  const requiredModalities = requiredModalitiesForMimeTypes(attachmentMimeTypes);
  const transformableModalities = requiredModalities.filter(
    (modality) =>
      ALWAYS_TRANSFORMABLE_MODALITIES.has(modality) ||
      (modality === RequiredModality.IMAGE_INPUT && helperVisionOnPlan),
  );
  return { attachmentMimeTypes, requiredModalities, transformableModalities };
}

/**
 * A SHORT digest of what the attachments say, for the research planner
 * (multimodal batch 8) — a transcript's opening words, an image's OCR text.
 * Bounded per file and overall; placeholders and empty rows contribute
 * nothing. Framed by the caller as data, never instructions.
 */
export function buildAttachmentDigest(files: readonly FileContentResponse[]): string {
  const parts: string[] = [];
  let used = 0;
  for (const file of files) {
    const text = (file.extractedText ?? '').replaceAll(/\s+/g, ' ').trim();
    if (text.length === 0 || isPlaceholder(text)) {
      continue;
    }
    const room = RESEARCH_ATTACHMENT_DIGEST_MAX_CHARS - used;
    if (room <= 0) {
      break;
    }
    const excerpt = text.slice(0, Math.min(RESEARCH_ATTACHMENT_DIGEST_PER_FILE_CHARS, room));
    const safeName = file.filename.replaceAll(/[\r\n"]/g, ' ');
    parts.push(`"${safeName}" (${file.mimeType}): ${excerpt}`);
    used += excerpt.length;
  }
  return parts.join('\n');
}

function isPlaceholder(text: string): boolean {
  return (
    text.startsWith(AUDIO_TRANSCRIPTION_PLACEHOLDER_PREFIX) ||
    text.startsWith(VIDEO_FILE_PLACEHOLDER_PREFIX) ||
    text.startsWith(IMAGE_FILE_PLACEHOLDER_PREFIX)
  );
}
