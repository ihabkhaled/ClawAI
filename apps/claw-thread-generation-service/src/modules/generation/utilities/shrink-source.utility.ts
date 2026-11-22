import { SHRINK_LEVEL_KEEP_RATIO, SHRINK_MIN_BUDGET_CHARS } from '../constants/healing.constants';
import { conversationLength, fitConversation } from './conversation-fit.utility';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The shared material JSON with its source conversation shrunk; unreadable material is kept as
 * is. The source is `sourceConversation` since material v2 and `sourceSnapshot` in v1.
 */
export function shrinkSharedMaterial(material: string, level: number): string {
  try {
    const parsed: unknown = JSON.parse(material);
    if (!isRecord(parsed)) return material;
    const { sourceConversation, sourceSnapshot } = parsed;
    if (isRecord(sourceConversation)) {
      return JSON.stringify({
        ...parsed,
        sourceConversation: shrinkSnapshot(sourceConversation, level),
      });
    }
    return isRecord(sourceSnapshot)
      ? JSON.stringify({ ...parsed, sourceSnapshot: shrinkSnapshot(sourceSnapshot, level) })
      : material;
  } catch {
    return material;
  }
}

/**
 * A smaller copy of the source conversation for a model whose window it overflows. Each level
 * keeps a quarter of the characters of the one before, condensed by `fitConversation` (every
 * message in order, long ones by their beginning and end, repeats once), and `fitNote` tells the
 * model what was left out. It never keeps only the newest turns. A snapshot with no message list
 * is returned unchanged; the input is never modified.
 */
export function shrinkSnapshot(
  snapshot: Record<string, unknown>,
  level: number,
): Record<string, unknown> {
  const { messages } = snapshot;
  if (!Array.isArray(messages) || messages.length === 0) return snapshot;
  const budget = Math.max(
    SHRINK_MIN_BUDGET_CHARS,
    Math.floor(conversationLength(messages) * SHRINK_LEVEL_KEEP_RATIO ** Math.max(1, level)),
  );
  const fitted = fitConversation(messages, budget);
  return {
    ...snapshot,
    messages: fitted.messages,
    shrunk: true,
    ...(fitted.note === null ? {} : { fitNote: fitted.note }),
  };
}
