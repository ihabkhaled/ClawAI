import {
  THREAD_HEADING_ID_FALLBACK,
  THREAD_HEADING_ID_MAX,
} from '@/constants/thread-article.constants';

/**
 * An anchor id for a heading, in the heading's own script: letters, marks and numbers of any
 * language stay (Arabic and Japanese headings keep their words), everything else becomes a
 * single dash. Never empty, so a heading that is only symbols still gets an anchor.
 */
export function slugifyHeading(text: string): string {
  const cleaned = text
    .normalize('NFKC')
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{M}\p{N}]+/gu, '-')
    .replaceAll(/^-+|-+$/gu, '');
  const cut = [...cleaned].slice(0, THREAD_HEADING_ID_MAX).join('').replaceAll(/-+$/gu, '');
  return cut === '' ? THREAD_HEADING_ID_FALLBACK : cut;
}

/** Hands out unique ids in document order: the second "Overview" becomes `overview-2`. */
export function createHeadingSlugger(): (text: string) => string {
  const used = new Map<string, number>();
  return (text) => {
    const base = slugifyHeading(text);
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    if (seen === 0) {
      return base;
    }
    let candidate = `${base}-${String(seen + 1)}`;
    while (used.has(candidate)) {
      candidate = `${candidate}-x`;
    }
    used.set(candidate, 1);
    return candidate;
  };
}
