import {
  CODE_FENCE,
  CODE_TICK,
  MAX_MENTIONS_PER_COMMENT,
  MENTION_PATTERN,
} from '../constants/publication-comments.constants';

/** Removes fenced and inline code so a username written as code is not a mention. One pass, no nesting. */
export function stripCode(text: string): string {
  let out = '';
  let index = 0;
  while (index < text.length) {
    if (text.startsWith(CODE_FENCE, index)) {
      const close = text.indexOf(CODE_FENCE, index + CODE_FENCE.length);
      if (close === -1) {
        // An unclosed fence is plain text, as a Markdown renderer would treat it.
        out += CODE_FENCE;
        index += CODE_FENCE.length;
      } else {
        out += ' ';
        index = close + CODE_FENCE.length;
      }
      continue;
    }
    if (text.charAt(index) === CODE_TICK) {
      const close = text.indexOf(CODE_TICK, index + 1);
      const lineEnd = text.indexOf('\n', index + 1);
      if (close !== -1 && (lineEnd === -1 || close < lineEnd)) {
        out += ' ';
        index = close + 1;
        continue;
      }
    }
    out += text.charAt(index);
    index += 1;
  }
  return out;
}

/**
 * The distinct usernames mentioned in a comment, lowercased, in order of first appearance, at most
 * `MAX_MENTIONS_PER_COMMENT`. These are only candidates: the caller keeps the ones that are real,
 * active accounts other than the author.
 */
export function parseMentionUsernames(content: string): string[] {
  const found = new Set<string>();
  for (const [, name] of stripCode(content).matchAll(MENTION_PATTERN)) {
    if (name === undefined) continue;
    found.add(name.toLowerCase());
    if (found.size >= MAX_MENTIONS_PER_COMMENT) break;
  }
  return [...found];
}
