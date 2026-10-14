import {
  SHRINK_ELLIPSIS as ELLIPSIS,
  SHRINK_KEEP_RATIO,
  SHRINK_MESSAGE_MAX_CHARS,
  SHRINK_MIN_MESSAGES,
} from '../constants/healing.constants';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Cuts by code points, so an emoji or a surrogate pair is never split in half. */
function clipText(text: string, maxChars: number): string {
  const points = [...text];
  return points.length <= maxChars ? text : `${points.slice(0, maxChars).join('')}${ELLIPSIS}`;
}

/** The shared material JSON with its source conversation shrunk; unreadable material is kept as is. */
export function shrinkSharedMaterial(material: string, level: number): string {
  try {
    const parsed: unknown = JSON.parse(material);
    if (!isRecord(parsed) || !isRecord(parsed['sourceSnapshot'])) return material;
    return JSON.stringify({
      ...parsed,
      sourceSnapshot: shrinkSnapshot(parsed['sourceSnapshot'], level),
    });
  } catch {
    return material;
  }
}

/**
 * A smaller copy of the source conversation for a model whose window it overflows: the opening
 * message (the topic) and the newest messages are kept, the middle is dropped, and each kept
 * message is clipped. Each level halves both limits. A snapshot with no message list is returned
 * unchanged; the input is never modified.
 */
export function shrinkSnapshot(
  snapshot: Record<string, unknown>,
  level: number,
): Record<string, unknown> {
  const messages = snapshot['messages'];
  if (!Array.isArray(messages) || messages.length === 0) return snapshot;
  const scale = SHRINK_KEEP_RATIO ** Math.max(1, level);
  const keep = Math.min(
    messages.length,
    Math.max(SHRINK_MIN_MESSAGES, Math.ceil(messages.length * scale)),
  );
  const maxChars = Math.max(200, Math.floor(SHRINK_MESSAGE_MAX_CHARS * scale));
  const kept =
    messages.length <= keep
      ? messages
      : [messages[0], ...messages.slice(messages.length - keep + 1)];
  return {
    ...snapshot,
    messages: kept.map((message: unknown) =>
      isRecord(message) && typeof message['content'] === 'string'
        ? { ...message, content: clipText(message['content'], maxChars) }
        : message,
    ),
    shrunk: true,
  };
}
