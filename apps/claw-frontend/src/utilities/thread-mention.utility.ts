import {
  THREAD_AUTHOR_INITIALS_MAX,
  THREAD_MENTION_MAX_LENGTH,
} from '@/constants/thread-community.constants';
import { ThreadMentionTokenKind } from '@/enums/thread-mention-token-kind.enum';
import type { ThreadAuthor, ThreadMentionToken } from '@/types/thread-community.types';

const NAME_CHAR = /[\p{L}\p{N}_]/u;
const NAME_JOINER = /[.-]/u;

function isNameChar(char: string): boolean {
  return NAME_CHAR.test(char);
}

/** Reads the username that starts at `start`, trimming a trailing joiner such as a full stop. */
function readName(content: string, start: number): string {
  let end = start;
  while (end < content.length && end - start <= THREAD_MENTION_MAX_LENGTH) {
    const char = content.charAt(end);
    const next = content.charAt(end + 1);
    if (isNameChar(char) || (NAME_JOINER.test(char) && isNameChar(next))) {
      end += 1;
      continue;
    }
    break;
  }
  return content.slice(start, end);
}

/**
 * Splits comment text into plain and `@username` parts. It is a single left-to-right scan (no
 * backtracking pattern), so hostile input cannot stall it, and the parts are only ever rendered
 * as text nodes, never as markup. An `@` inside a word (an email address) is not a mention, and
 * a name longer than the limit stays plain text. When `known` is given (the usernames the server
 * resolved for this comment), only those names become mentions; any other `@name` is plain text.
 */
export function tokenizeMentions(
  content: string,
  known?: ReadonlyArray<string>,
): ThreadMentionToken[] {
  const knownNames = known === undefined ? null : new Set(known.map((name) => name.toLowerCase()));
  const tokens: ThreadMentionToken[] = [];
  let plainStart = 0;
  let index = 0;
  while (index < content.length) {
    const previous = index === 0 ? ' ' : content.charAt(index - 1);
    if (content.charAt(index) !== '@' || isNameChar(previous) || previous === '@') {
      index += 1;
      continue;
    }
    const name = readName(content, index + 1);
    if (
      name.length === 0 ||
      name.length > THREAD_MENTION_MAX_LENGTH ||
      (knownNames !== null && !knownNames.has(name.toLowerCase()))
    ) {
      index += 1;
      continue;
    }
    if (index > plainStart) {
      tokens.push({
        start: plainStart,
        kind: ThreadMentionTokenKind.Text,
        value: content.slice(plainStart, index),
      });
    }
    tokens.push({ start: index, kind: ThreadMentionTokenKind.Mention, value: name });
    index += name.length + 1;
    plainStart = index;
  }
  if (plainStart < content.length) {
    tokens.push({
      start: plainStart,
      kind: ThreadMentionTokenKind.Text,
      value: content.slice(plainStart),
    });
  }
  return tokens;
}

/** The text a reply box starts with: an `@username ` address, or nothing for an unknown author. */
export function mentionPrefill(author: ThreadAuthor | null): string {
  return author === null ? '' : `@${author.username} `;
}

/** One or two capital letters for the avatar circle; a symbol-only name gives a bullet. */
export function authorInitials(author: ThreadAuthor | null): string {
  const source = author === null ? '' : author.displayName.trim() || author.username;
  const letters = Array.from(source.split(/\s+/u))
    .map((word) => Array.from(word).find((char) => isNameChar(char)) ?? '')
    .filter((char) => char !== '')
    .slice(0, THREAD_AUTHOR_INITIALS_MAX);
  return letters.length === 0 ? '•' : letters.join('').toUpperCase();
}
