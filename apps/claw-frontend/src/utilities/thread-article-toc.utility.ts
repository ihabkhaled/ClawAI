import {
  THREAD_READING_CHARACTERS_PER_MINUTE,
  THREAD_READING_WORDS_PER_MINUTE,
  THREAD_TOC_MAX_LEVEL,
  THREAD_UNSPACED_LOCALES,
} from '@/constants/thread-article.constants';
import type { ThreadTocItem } from '@/types/thread-article.types';
import { createHeadingSlugger } from '@/utilities/thread-heading-slug.utility';

const FENCE = /^\s*(?:```|~~~)/u;
const ATX_HEADING = /^ {0,3}(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/u;

/**
 * Removes every `<...>` segment in one left-to-right scan. A regex such as `/<[^>]*>/g` can be
 * defeated by nesting ('<scr<script>ipt' keeps '<script'); this scan consumes from each '<' to the
 * next '>' (or to the end), so no tag text can survive. Raw HTML never renders in the article.
 */
function stripAngleSegments(text: string): string {
  let out = '';
  let index = 0;
  while (index < text.length) {
    const open = text.indexOf('<', index);
    if (open === -1) {
      out += text.slice(index);
      break;
    }
    out += text.slice(index, open);
    const close = text.indexOf('>', open + 1);
    index = close === -1 ? text.length : close + 1;
  }
  return out.replaceAll('>', '');
}

/** Plain text of a heading's inline markdown: links keep their label, emphasis and code lose their marks. */
export function plainHeadingText(inline: string): string {
  return stripAngleSegments(inline)
    .replaceAll(/!\[([^\]]*)\]\([^)]*\)/gu, '$1')
    .replaceAll(/\[([^\]]*)\]\([^)]*\)/gu, '$1')
    .replaceAll(/(?<!\\)[`*_~]/gu, '')
    .replaceAll(/\\([\\`*_{}[\]()#+\-.!|~>])/gu, '$1')
    .replaceAll(/\s+/gu, ' ')
    .trim();
}

export function sameHeadingText(heading: string, title: string | undefined): boolean {
  if (title === undefined) {
    return false;
  }
  const norm = (value: string): string => value.normalize('NFKC').replaceAll(/\s+/gu, ' ').trim();
  return norm(heading).toLowerCase() === norm(title).toLowerCase();
}

/**
 * The headings an article lists in its table of contents (H2 and H3), with the ids the renderer
 * gives them. Mirrors `rehypeThreadHeadings`: the first H1 equal to the title is skipped, other
 * H1s count as H2, headings inside code fences are ignored.
 */
export function extractThreadToc(markdown: string, title?: string): ThreadTocItem[] {
  const slug = createHeadingSlugger();
  const items: ThreadTocItem[] = [];
  let inFence = false;
  let first = true;
  for (const line of markdown.split(/\r?\n/u)) {
    if (FENCE.test(line)) {
      inFence = !inFence;
      continue;
    }
    const match = inFence ? null : ATX_HEADING.exec(line);
    if (!match?.[1] || match[2] === undefined) {
      continue;
    }
    const text = plainHeadingText(match[2]);
    const level = match[1].length;
    const isFirst = first;
    first = false;
    if (level === 1 && isFirst && sameHeadingText(text, title)) {
      continue;
    }
    if (level > THREAD_TOC_MAX_LEVEL) {
      continue;
    }
    items.push({ id: slug(text), text, level: level === 3 ? 3 : 2 });
  }
  return items;
}

/** Minutes to read, rounded up, at least 1. Unspaced scripts (ja, zh, th) count characters. */
export function estimateReadingMinutes(markdown: string, contentLocale: string): number {
  const text = markdown.replaceAll(/\[[0-9a-f]{8,}\]/giu, ' ');
  const unspaced = THREAD_UNSPACED_LOCALES.includes(contentLocale);
  const units = unspaced
    ? text.replaceAll(/[\s#>*|`_-]/gu, '').length
    : (text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).length;
  const perMinute = unspaced
    ? THREAD_READING_CHARACTERS_PER_MINUTE
    : THREAD_READING_WORDS_PER_MINUTE;
  return Math.max(1, Math.ceil(units / perMinute));
}
