import { FileDeliveryMode } from '../../../common/enums/file-delivery-mode.enum';
import {
  ATTACHMENT_POINTER_DESCRIBED_IMAGES,
  ATTACHMENT_POINTER_EARLIER,
  ATTACHMENT_POINTER_LEAD,
  ATTACHMENT_POINTER_MARKER,
  ATTACHMENT_POINTER_UNDESCRIBED_IMAGES,
  ATTACHMENT_POINTER_UNREADABLE,
  CANNOT_VIEW_ATTACHMENT_PATTERN,
  EARLIER_ATTACHMENT_TEXT_MAX_CHARS,
  EARLIER_ATTACHMENT_TRUNCATION_NOTE,
} from '../constants/attachment-awareness.constants';
import { IMAGE_FILE_PLACEHOLDER_PREFIX } from '../constants/media-placeholder.constants';
import type {
  AttachmentDescriptor,
  AttachmentPointerContext,
} from '../types/attachment-only-turn.types';
import type { FileContentResponse } from '../types/context.types';
import { attachmentKindOf } from './attachment-only-turn.utility';

/**
 * File ids attached in EARLIER user turns of the thread, newest first, so a
 * follow-up ("and the second button?") still has the evidence. Bounded by
 * `max`; ids already attached to this turn are skipped. The latest user row is
 * the current turn and is never "earlier".
 */
export function collectEarlierAttachmentIds(
  messages: readonly { role: string; metadata?: unknown }[],
  currentIds: readonly string[],
  max: number,
): string[] {
  const latestUser = messages.map((message) => message.role).lastIndexOf('USER');
  const seen = new Set<string>(currentIds);
  const collected: string[] = [];
  for (let index = messages.length - 1; index >= 0 && collected.length < max; index -= 1) {
    const message = messages.at(index);
    if (message?.role !== 'USER' || index === latestUser) {
      continue;
    }
    for (const id of fileIdsOf(message.metadata)) {
      if (!seen.has(id) && collected.length < max) {
        seen.add(id);
        collected.push(id);
      }
    }
  }
  return collected;
}

function fileIdsOf(metadata: unknown): string[] {
  if (metadata === null || typeof metadata !== 'object') {
    return [];
  }
  const ids = (metadata as Record<string, unknown>)['fileIds'];
  return Array.isArray(ids)
    ? ids.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : [];
}

/**
 * An earlier turn's file, with its text shortened. Video is never carried
 * (frames and a per-frame helper call are too heavy for a follow-up).
 */
export function limitEarlierFile(file: FileContentResponse): FileContentResponse {
  const text = file.extractedText;
  return typeof text === 'string' && text.length > EARLIER_ATTACHMENT_TEXT_MAX_CHARS
    ? {
        ...file,
        extractedText: `${text.slice(0, EARLIER_ATTACHMENT_TEXT_MAX_CHARS)}${EARLIER_ATTACHMENT_TRUNCATION_NOTE}`,
      }
    : file;
}

/**
 * A document (not a picture, recording or video) whose only "text" is the
 * image placeholder file-service writes when OCR found nothing: a scanned PDF
 * that could not be read. Its content is NOT in the conversation.
 */
export function isUnreadableScannedDocument(
  file: AttachmentDescriptor & { extractedText?: string | null },
): boolean {
  const kind = attachmentKindOf(file);
  return (
    kind === 'document' &&
    (file.extractedText?.trim() ?? '').startsWith(IMAGE_FILE_PLACEHOLDER_PREFIX)
  );
}

/** True when the planner's reasoning claims the AI cannot view the attachments. */
export function claimsCannotViewAttachment(text: string): boolean {
  return CANNOT_VIEW_ATTACHMENT_PATTERN.test(text);
}

/**
 * The block appended to the final user turn when files travel with it. It
 * depends on the files and on how they reached this lane — never on what the
 * user typed — so "where do I press?", "." and "summarise" are treated alike.
 * Empty when no file is involved.
 */
export function buildAttachmentTurnPointer(context: AttachmentPointerContext): string {
  const earlier = new Set(context.earlierFileIds ?? []);
  const isEarlier = (id: string | undefined): boolean => id !== undefined && earlier.has(id);
  const allCurrent = context.fileContents.filter((file) => !isEarlier(file.id));
  const current = allCurrent.filter((file) => !isUnreadableScannedDocument(file));
  const unreadable = Math.max(
    0,
    (context.requestedAttachmentCount ?? allCurrent.length) - current.length,
  );
  const hasEarlier = allCurrent.length < context.fileContents.length;
  if (current.length === 0 && unreadable === 0 && !hasEarlier) {
    return '';
  }
  const lines: string[] = [ATTACHMENT_POINTER_MARKER];
  if (current.length > 0) {
    const names = current.map((file) => `"${file.filename}" (${attachmentKindOf(file)})`);
    lines.push(ATTACHMENT_POINTER_LEAD, `Attached: ${names.join(', ')}.`);
  }
  const currentIds = new Set(current.flatMap((file) => (file.id === undefined ? [] : [file.id])));
  const decisions = (context.attachmentDelivery?.decisions ?? []).filter((decision) =>
    currentIds.has(decision.fileId),
  );
  const described = decisions.filter(
    (decision) => decision.mode === FileDeliveryMode.DERIVED_IMAGE_TEXT,
  ).length;
  const undescribed = decisions.filter(
    (decision) => decision.mode === FileDeliveryMode.OMITTED_NO_VISION,
  ).length;
  if (described > 0) {
    lines.push(ATTACHMENT_POINTER_DESCRIBED_IMAGES.replace('{COUNT}', String(described)));
  }
  if (undescribed > 0) {
    lines.push(ATTACHMENT_POINTER_UNDESCRIBED_IMAGES.replace('{COUNT}', String(undescribed)));
  }
  if (unreadable > 0) {
    lines.push(ATTACHMENT_POINTER_UNREADABLE.replace('{COUNT}', String(unreadable)));
  }
  if (hasEarlier) {
    lines.push(ATTACHMENT_POINTER_EARLIER);
  }
  return lines.join('\n');
}

/** The user turn with the pointer after it; unchanged when there is none or it is already there. */
export function withAttachmentPointer(turnText: string, context: AttachmentPointerContext): string {
  const pointer = buildAttachmentTurnPointer(context);
  return pointer.length === 0 || turnText.includes(ATTACHMENT_POINTER_MARKER)
    ? turnText
    : `${turnText}\n\n${pointer}`;
}
