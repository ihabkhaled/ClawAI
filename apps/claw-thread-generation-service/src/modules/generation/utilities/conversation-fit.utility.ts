import {
  FIT_DUPLICATE_MIN_CHARS,
  FIT_FLOOR_CHARS_PER_MESSAGE,
  FIT_HEAD_SHARE,
  FIT_MIN_CHARS_PER_MESSAGE,
  FIT_OMITTED_MARKER_LEAD,
  FIT_OMITTED_MARKER_TAIL,
  FIT_RECENCY_BOOST,
  FIT_USER_WEIGHT,
} from '../constants/conversation-fit.constants';
import type { FitEntry, FittedConversation } from '../types/conversation-fit.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function contentOf(message: unknown): string | null {
  return isRecord(message) && typeof message['content'] === 'string' ? message['content'] : null;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** Code points, so an emoji or a surrogate pair always counts (and is cut) as one. */
function lengthOf(text: string | null): number {
  return text === null ? 0 : [...text].length;
}

/** The text's characters, counted the same way the budget counts them. */
export function conversationLength(messages: readonly unknown[]): number {
  return sum(messages.map((message) => lengthOf(contentOf(message))));
}

/**
 * A long message repeated word for word (a regenerated answer, a re-sent prompt) is kept once,
 * at its newest place; short repeats such as "Ok" are real turns and stay.
 */
function withoutRepeats(messages: readonly unknown[]): { kept: unknown[]; removed: number } {
  const keyOf = (message: unknown): string | null => {
    const text = contentOf(message)?.trim() ?? '';
    return text.length >= FIT_DUPLICATE_MIN_CHARS ? text : null;
  };
  const lastIndex = new Map<string, number>();
  for (const [index, message] of messages.entries()) {
    const key = keyOf(message);
    if (key !== null) lastIndex.set(key, index);
  }
  const kept = messages.filter((message, index) => {
    const key = keyOf(message);
    return key === null || lastIndex.get(key) === index;
  });
  return { kept, removed: messages.length - kept.length };
}

/** Owner turns carry intent and corrections; later turns refine earlier ones. */
function toEntries(messages: readonly unknown[]): FitEntry[] {
  const lastIndex = Math.max(1, messages.length - 1);
  return messages.map((message, index) => {
    const content = contentOf(message);
    const roleWeight = isRecord(message) && message['role'] === 'USER' ? FIT_USER_WEIGHT : 1;
    return {
      message,
      content,
      length: lengthOf(content),
      weight: roleWeight * (1 + (FIT_RECENCY_BOOST * index) / lastIndex),
      share: 0,
    };
  });
}

/**
 * Sets each entry's share: a floor for every message, the rest by length times weight, never more
 * than a message has. Water-filling: what a short message cannot use goes round again.
 */
function allocate(entries: FitEntry[], budget: number, floor: number): void {
  for (const entry of entries) entry.share = Math.min(entry.length, floor);
  let left = budget - sum(entries.map(({ share }) => share));
  for (let round = 0; round < entries.length && left > 0; round += 1) {
    const open = entries.filter((entry) => entry.share < entry.length);
    const demand = sum(open.map((entry) => entry.length * entry.weight));
    if (open.length === 0 || demand <= 0) break;
    let given = 0;
    for (const entry of open) {
      const wanted = Math.floor((left * entry.length * entry.weight) / demand);
      const added = Math.min(wanted, entry.length - entry.share);
      entry.share += added;
      given += added;
    }
    if (given === 0) break;
    left -= given;
  }
}

/** The beginning and the end of a long message, with the cut named in the middle. */
function condense(text: string, keep: number): string {
  const points = [...text];
  const head = Math.ceil(keep * FIT_HEAD_SHARE);
  const tail = Math.max(0, keep - head);
  const omitted = points.length - head - tail;
  return `${points.slice(0, head).join('')}${FIT_OMITTED_MARKER_LEAD}${String(omitted)}${FIT_OMITTED_MARKER_TAIL}${tail > 0 ? points.slice(points.length - tail).join('') : ''}`;
}

/**
 * Condenses a source conversation to about `budget` characters by relevance and order, never by
 * a head cut: long repeats are kept once, every message keeps its place, owner turns and newer
 * turns get a larger share, and a long message keeps its beginning and end with the cut marked.
 * Only when even a floor share per message cannot fit are middle messages omitted (the first is
 * always kept). The returned note says exactly what was left out, for the model to read.
 */
export function fitConversation(messages: readonly unknown[], budget: number): FittedConversation {
  const { kept: unique, removed } = withoutRepeats(messages);
  const notes: string[] = [];
  if (removed > 0) {
    notes.push(`${String(removed)} repeated message(s) removed, the latest copy of each kept`);
  }
  let entries = toEntries(unique);
  if (sum(entries.map(({ length }) => length)) <= budget) {
    return { messages: unique, note: notes.length > 0 ? `${notes.join('; ')}.` : null };
  }
  const capacity = Math.max(2, Math.floor(budget / FIT_FLOOR_CHARS_PER_MESSAGE));
  if (entries.length > capacity) {
    const omitted = entries.length - capacity;
    entries = [...entries.slice(0, 1), ...entries.slice(entries.length - capacity + 1)];
    notes.push(`${String(omitted)} older message(s) from the middle omitted`);
  }
  const floor = Math.max(
    FIT_FLOOR_CHARS_PER_MESSAGE,
    Math.min(FIT_MIN_CHARS_PER_MESSAGE, Math.floor(budget / entries.length)),
  );
  const markerLength = lengthOf(`${FIT_OMITTED_MARKER_LEAD}0000000${FIT_OMITTED_MARKER_TAIL}`);
  allocate(entries, budget, floor);
  let shortened = 0;
  const fitted = entries.map((entry) => {
    const { share } = entry;
    if (entry.content === null || share >= entry.length || !isRecord(entry.message)) {
      return entry.message;
    }
    shortened += 1;
    return {
      ...entry.message,
      content: condense(entry.content, Math.max(0, share - markerLength)),
    };
  });
  if (shortened > 0) {
    notes.push(
      `${String(shortened)} of ${String(entries.length)} messages show only their beginning and end`,
    );
  }
  return {
    messages: fitted,
    note: `Condensed to fit the model window, order kept: ${notes.join('; ')}.`,
  };
}
