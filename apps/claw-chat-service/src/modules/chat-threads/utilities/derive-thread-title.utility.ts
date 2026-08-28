import {
  THREAD_TITLE_ELLIPSIS,
  THREAD_TITLE_MAX_LENGTH,
  THREAD_TITLE_MIN_WORD_BOUNDARY,
} from '../constants/thread-title.constants';

/**
 * Names a thread after its opening message.
 *
 * Derived, not generated: asking a model to write the title would spend the
 * user's own allowance on a cosmetic field, and every call in this service goes
 * through the deduction chokepoint — so a thread would silently cost tokens
 * nobody asked to spend. The opening sentence of a prompt is already what the
 * person would have typed as a title.
 *
 * Threads currently show the first eighty characters, cut mid-word and
 * mid-markdown: `Create ONE new file. Read NOTHING. No prose before the tool
 * call. Use "create". `. This takes the first sentence instead, so that becomes
 * `Create ONE new file`.
 *
 * Returns null when nothing usable survives — an empty title is better than a
 * title made of backticks, and the caller leaves the thread unnamed.
 */
export function deriveThreadTitle(content: string): string | null {
  const flattened = flatten(content);
  if (flattened.length === 0) {
    return null;
  }

  const sentence = firstSentence(flattened);
  if (sentence.length <= THREAD_TITLE_MAX_LENGTH) {
    return sentence;
  }

  return `${cutAtWordBoundary(sentence)}${THREAD_TITLE_ELLIPSIS}`;
}

/**
 * Strips the parts of a prompt that are structure rather than words.
 *
 * A fenced block is the single biggest source of unreadable titles: a prompt
 * that opens with code produced a title of braces and imports.
 */
function flatten(content: string): string {
  return content
    .replaceAll(/```[\s\S]*?```/g, ' ')
    .replaceAll(/`([^`]*)`/g, '$1')
    .replaceAll(/^#{1,6}\s+/gm, '')
    .replaceAll(/[*_>]/g, '')
    .replaceAll(/\s+/g, ' ')
    .trim();
}

/**
 * The opening sentence, without its terminator.
 *
 * A title is a name, not a quotation, so the full stop is dropped — but a
 * question mark is kept, because "Why is this failing?" reads as a different
 * thread from "Why is this failing".
 */
function firstSentence(text: string): string {
  const match = /^(.*?)([.!?])(\s|$)/.exec(text);
  if (match === null) {
    return text;
  }
  const [, body = '', terminator = ''] = match;
  const trimmed = body.trim();
  if (trimmed.length === 0) {
    return text;
  }
  return terminator === '.' ? trimmed : `${trimmed}${terminator}`;
}

/**
 * Cuts to the last whole word inside the limit.
 *
 * Falling back to a hard cut matters for a language that does not space its
 * words: in Japanese or Thai there is no boundary to find, and returning three
 * characters would be worse than a clean cut at the limit.
 */
function cutAtWordBoundary(text: string): string {
  const clipped = text.slice(0, THREAD_TITLE_MAX_LENGTH);
  const lastSpace = clipped.lastIndexOf(' ');
  if (lastSpace < THREAD_TITLE_MIN_WORD_BOUNDARY) {
    return clipped.trimEnd();
  }
  return clipped.slice(0, lastSpace).trimEnd();
}
