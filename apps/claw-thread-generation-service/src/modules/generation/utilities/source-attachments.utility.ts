import { ATTACHMENT_TURN_KIND, ATTACHMENT_TURN_LEAD } from '../constants/source-prompt.constants';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function attachmentTurns(message: Record<string, unknown>): Record<string, unknown>[] {
  const { attachments } = message;
  if (!Array.isArray(attachments)) return [];
  return attachments.flatMap((attachment) =>
    isRecord(attachment) &&
    typeof attachment['name'] === 'string' &&
    typeof attachment['text'] === 'string' &&
    attachment['text'].trim().length > 0
      ? [
          {
            role: message['role'],
            kind: ATTACHMENT_TURN_KIND,
            attachedTo: message['id'],
            content: `${ATTACHMENT_TURN_LEAD}${attachment['name']}:\n${attachment['text']}`,
          },
        ]
      : [],
  );
}

/**
 * The snapshot with each attached file's text as its own turn, right after the message it was
 * attached to, framed `Attached file <name>:`. The fit utilities then treat a long file like a
 * long message. A snapshot with no attached text is returned as is (same object), so a job made
 * before attachments travelled keeps its prompt hash; the input is never modified.
 */
export function withAttachmentTurns(snapshot: Record<string, unknown>): Record<string, unknown> {
  const { messages } = snapshot;
  if (!Array.isArray(messages)) return snapshot;
  if (!messages.some((message) => isRecord(message) && Array.isArray(message['attachments']))) {
    return snapshot;
  }
  return {
    ...snapshot,
    messages: messages.flatMap((message) => {
      if (!isRecord(message) || !Array.isArray(message['attachments'])) return [message];
      const { attachments: _attachments, ...turn } = message;
      return [turn, ...attachmentTurns(message)];
    }),
  };
}
