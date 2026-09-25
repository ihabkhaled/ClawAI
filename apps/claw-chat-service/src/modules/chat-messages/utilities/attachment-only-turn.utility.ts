import {
  ATTACHMENT_ONLY_KIND_LINES,
  ATTACHMENT_ONLY_KIND_ORDER,
  ATTACHMENT_ONLY_LANGUAGE_LINE,
  ATTACHMENT_ONLY_MIME_PREFIX_KINDS,
  ATTACHMENT_ONLY_ROUTING_HINT,
  ATTACHMENT_ONLY_TURN_LEAD,
  ATTACHMENT_ONLY_TURN_MARKER,
  ATTACHMENT_ONLY_UNREADABLE_INSTRUCTION,
  TRIVIAL_USER_TEXT_PATTERN,
} from '../constants/attachment-only-turn.constants';
import {
  type AttachmentDescriptor,
  type AttachmentOnlyKind,
  type AttachmentTurnContext,
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
  requestedCount: number = files.length,
): string {
  if (!isTrivialUserText(content)) {
    return content;
  }
  if (files.length > 0) {
    return buildAttachmentOnlyInstruction(files);
  }
  // Attached, but nothing readable arrived — a video still processing, a
  // failed extraction. An empty turn here got a generic greeting (or a
  // provider's "empty message" refusal); the user must hear that the file
  // could not be read instead.
  return requestedCount > 0 ? ATTACHMENT_ONLY_UNREADABLE_INSTRUCTION : content;
}

/** `resolveUserTurnText` for an assembled context: its files and what was asked for. */
export function resolveContextTurnText(content: string, context: AttachmentTurnContext): string {
  return resolveUserTurnText(
    content,
    context.fileContents,
    context.requestedAttachmentCount ?? context.fileContents.length,
  );
}

/**
 * The history a lab stage or a judge reads, with the attachment-only turn
 * spelled out.
 *
 * The builders already rewrite the FINAL user turn, but a lab mode appends its
 * own prompt after it (a sub-task, a rubric, a synthesis request), so the
 * user's empty row stops being final: it reached the model as an empty user
 * message — which Anthropic and Gemini reject outright — and the stage never
 * learned the attachment was the question. Rewriting the latest USER row here,
 * per request and never in storage, gives every stage the same request the
 * chat lane sees. Returns the input array unchanged when there is nothing to do.
 */
export function withAttachmentOnlyUserTurn<T extends { role: string; content: string }>(
  messages: T[],
  context: AttachmentTurnContext,
): T[] {
  const index = messages.reduce(
    (found, message, position) => (message.role === 'USER' ? position : found),
    -1,
  );
  const latest = index < 0 ? null : messages.at(index);
  if (latest === null || latest === undefined) {
    return messages;
  }
  const content = resolveContextTurnText(latest.content, context);
  if (content === latest.content) {
    return messages;
  }
  const rewritten = { ...latest, content };
  return messages.map((message, position) => (position === index ? rewritten : message));
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
