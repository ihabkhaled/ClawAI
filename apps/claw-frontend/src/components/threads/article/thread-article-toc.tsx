import type { ReactElement } from 'react';

import { cn } from '@/lib/utils';
import type { ThreadArticleTocProps } from '@/types/thread-article.types';

/**
 * The article's table of contents: a collapsible block above the text on a phone, a sticky side
 * column on a desktop. The caller renders it only for an article with enough headings. Both
 * variants carry the same links; the one that does not apply is `display: none`, so a screen
 * reader meets one list.
 */
export function ThreadArticleToc({ items, label }: ThreadArticleTocProps): ReactElement {
  const list = (
    <ol className="space-y-1.5 text-sm">
      {items.map((item) => (
        <li key={item.id} className={cn(item.level === 3 && 'ps-4')}>
          <a
            href={`#${item.id}`}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring block rounded py-0.5 break-words focus-visible:ring-2 focus-visible:outline-none"
          >
            {item.text}
          </a>
        </li>
      ))}
    </ol>
  );
  return (
    <>
      <details className="border-border bg-muted/30 mb-6 rounded-lg border p-3 lg:hidden">
        <summary className="cursor-pointer text-sm font-semibold">{label}</summary>
        <nav aria-label={label} className="mt-3">
          {list}
        </nav>
      </details>
      <nav
        aria-label={label}
        className="hidden lg:sticky lg:top-24 lg:order-2 lg:block lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-y-auto"
      >
        <p className="mb-2 text-sm font-semibold">{label}</p>
        {list}
      </nav>
    </>
  );
}
