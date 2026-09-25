import {
  ATTACHMENT_ONLY_KIND_LINES,
  ATTACHMENT_ONLY_KIND_ORDER,
  ATTACHMENT_ONLY_LANGUAGE_LINE,
  ATTACHMENT_ONLY_MIME_PREFIX_KINDS,
  ATTACHMENT_ONLY_ROUTING_HINT,
  ATTACHMENT_ONLY_TURN_LEAD,
  ATTACHMENT_ONLY_TURN_MARKER,
  TRIVIAL_USER_TEXT_PATTERN,
} from '../constants/attachment-only-turn.constants';
import {
  type AttachmentDescriptor,
  type AttachmentOnlyKind,
} from '../types/attachment-only-turn.types';

/** True when the text carries no request: empty, whitespace or punctuation only. */
export function isTrivialUserText(text: string): boolean {
  return TRIVIAL_USER_TEXT_PATTERN.test(text);
}

function kindOf(file: AttachmentDescriptor): AttachmentOnlyKind {
  const match = ATTACHMENT_ONLY_MIME_PREFIX_KINDS.find(([prefix]) =>
    file.mimeType.startsWith(prefix),
  );
  return match === undefined ? 'document' : match[1];
}

/** The user turn a model answers when the user sent only attachments. */
export function buildAttachmentOnlyInstruction(files: readonly AttachmentDescriptor[]): string {
  const kinds = new Set(files.map(kindOf));
  const names = files.map((file) => `"${file.filename}"`).join(', ');
  return [
    ATTACHMENT_ONLY_TURN_MARKER,
    ATTACHMENT_ONLY_TURN_LEAD,
    `Attached: ${names}.`,
    ...ATTACHMENT_ONLY_KIND_ORDER.filter((kind) => kinds.has(kind)).map(
      (kind) => ATTACHMENT_ONLY_KIND_LINES.get(kind) ?? '',
    ),
    ATTACHMENT_ONLY_LANGUAGE_LINE,
  ].join('\n');
}

/**
 * The text a model sees for the final user turn. Unchanged unless the user
 * typed nothing meaningful AND attached something — then the attachment is
 * the request.
 */
export function resolveUserTurnText(
  content: string,
  files: readonly AttachmentDescriptor[],
): string {
  return files.length > 0 && isTrivialUserText(content)
    ? buildAttachmentOnlyInstruction(files)
    : content;
}

/** The `content` routing-service scores for a stored user row. */
export function resolveRoutingContent(content: string, metadata: unknown): string {
  const fileIds =
    metadata !== null && typeof metadata === 'object'
      ? (metadata as Record<string, unknown>)['fileIds']
      : undefined;
  const hasFiles = Array.isArray(fileIds) && fileIds.length > 0;
  return hasFiles && isTrivialUserText(content) ? ATTACHMENT_ONLY_ROUTING_HINT : content;
}
