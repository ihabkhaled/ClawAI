import {
  CITATION_HREF_PATTERN,
  CITATION_HREF_PREFIX,
  CITATION_SAFE_PROTOCOLS,
} from '@/constants/message-citation.constants';
import type { MessageCitation } from '@/types';

/** Citations stored on an answer's metadata, tolerant of odd JSON. */
export function citationsOfMessage(
  metadata: Record<string, unknown> | null | undefined,
): MessageCitation[] {
  const citations = metadata?.['citations'];
  if (!Array.isArray(citations)) {
    return [];
  }
  return citations.filter(
    (citation): citation is MessageCitation =>
      typeof citation === 'object' &&
      citation !== null &&
      typeof (citation as MessageCitation).index === 'number' &&
      typeof (citation as MessageCitation).url === 'string',
  );
}

/** The fragment href the citation plugin writes for `[n]`. */
export function citationHref(index: number): string {
  return `${CITATION_HREF_PREFIX}${String(index)}`;
}

/** The `[n]` an href stands for, or null for an ordinary link. */
export function citationIndexFromHref(href: string | undefined): number | null {
  const match = href === undefined ? null : CITATION_HREF_PATTERN.exec(href);
  return match?.[1] === undefined ? null : Number(match[1]);
}

/**
 * The source URL when it is safe to open — http or https only. A model or a
 * crawled page cannot turn a citation into `javascript:` or a local file.
 */
export function safeCitationUrl(url: string): string | null {
  try {
    return CITATION_SAFE_PROTOCOLS.includes(new URL(url).protocol) ? url : null;
  } catch {
    return null;
  }
}

/** The host a citation points at, for its label ("ratp.fr"). */
export function citationHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Same citations by value. The renderer is memoised for performance, and a
 * bubble rebuilds its citation array on every render — a reference compare
 * would re-parse every answer on every keystroke.
 */
export function sameCitations(
  a: readonly MessageCitation[] | undefined,
  b: readonly MessageCitation[] | undefined,
): boolean {
  const left = a ?? [];
  const right = b ?? [];
  return (
    left.length === right.length &&
    left.every((entry, i) => entry.index === right[i]?.index && entry.url === right[i]?.url)
  );
}
