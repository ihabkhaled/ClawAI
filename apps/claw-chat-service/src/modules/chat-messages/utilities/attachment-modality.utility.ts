import { RequiredModality } from '@claw/shared-types';

import {
  ALWAYS_TRANSFORMABLE_MODALITIES,
  MIME_PREFIX_MODALITIES,
  RESEARCH_ATTACHMENT_DIGEST_MAX_CHARS,
  RESEARCH_ATTACHMENT_DIGEST_PER_FILE_CHARS,
  RESEARCH_DIGEST_VIDEO_PROCESSING_NOTE,
} from '../constants/attachment-modality.constants';
import {
  PLANNER_MANIFEST_IMAGE_PENDING,
  PLANNER_MANIFEST_NAME_MAX_CHARS,
  PLANNER_MANIFEST_NO_TEXT_YET,
} from '../constants/attachment-awareness.constants';
import { attachmentKindOf } from './attachment-only-turn.utility';
import { VIDEO_MIME_PREFIX } from '../../../common/constants/execution.constants';
import { AUDIO_TRANSCRIPTION_PLACEHOLDER_PREFIX } from '../constants/voice-note.constants';
import {
  IMAGE_FILE_PLACEHOLDER_PREFIX,
  VIDEO_FILE_PLACEHOLDER_PREFIX,
} from '../constants/media-placeholder.constants';
import type { AttachmentModalityFields } from '../types/attachment-modality.types';
import type { FileContentResponse } from '../types/context.types';
import { videoInFlight, videoProcessingFailed } from './video-context.utility';

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
 * What the research planner sees of the attachments (ADR-152): ONE line per
 * file, whatever the user typed — kind, name, and either its derived text
 * (transcript, OCR, document text), a vision-helper description already
 * written for it, or an honest "read by the answering AI" state. Without it
 * the planner knew nothing of the files and invented "I cannot view images".
 * Bounded per file and overall. Framed by the caller as data, never
 * instructions.
 */
export function buildAttachmentDigest(
  files: readonly FileContentResponse[],
  describedImage?: (fileId: string) => string | undefined,
): string {
  const lines: string[] = [];
  let used = 0;
  for (const file of files) {
    const room = RESEARCH_ATTACHMENT_DIGEST_MAX_CHARS - used;
    if (room <= 0) {
      break;
    }
    const safeName = file.filename
      .replaceAll(/[\r\n"]/g, ' ')
      .slice(0, PLANNER_MANIFEST_NAME_MAX_CHARS);
    const detail = digestDetailOf(file, describedImage?.(file.id));
    const line = `- "${safeName}" (${attachmentKindOf(file)}, ${file.mimeType}): ${detail}`.slice(
      0,
      room,
    );
    lines.push(line);
    used += line.length;
  }
  return lines.join('\n');
}

/** What one attachment contributes to its digest line; never empty. */
function digestDetailOf(file: FileContentResponse, described: string | undefined): string {
  const text = (file.extractedText ?? '').replaceAll(/\s+/g, ' ').trim();
  if (text.length > 0 && !isPlaceholder(text)) {
    return text.slice(0, RESEARCH_ATTACHMENT_DIGEST_PER_FILE_CHARS);
  }
  const helperText = (described ?? '').replaceAll(/\s+/g, ' ').trim();
  if (helperText.length > 0) {
    return `described by a vision assistant: ${helperText.slice(0, RESEARCH_ATTACHMENT_DIGEST_PER_FILE_CHARS)}`;
  }
  if (file.mimeType.toLowerCase().startsWith(VIDEO_MIME_PREFIX)) {
    return videoInFlight(file) && !videoProcessingFailed(file)
      ? RESEARCH_DIGEST_VIDEO_PROCESSING_NOTE
      : PLANNER_MANIFEST_NO_TEXT_YET;
  }
  return file.mimeType.toLowerCase().startsWith('image/')
    ? PLANNER_MANIFEST_IMAGE_PENDING
    : PLANNER_MANIFEST_NO_TEXT_YET;
}

function isPlaceholder(text: string): boolean {
  return (
    text.startsWith(AUDIO_TRANSCRIPTION_PLACEHOLDER_PREFIX) ||
    text.startsWith(VIDEO_FILE_PLACEHOLDER_PREFIX) ||
    text.startsWith(IMAGE_FILE_PLACEHOLDER_PREFIX)
  );
}
