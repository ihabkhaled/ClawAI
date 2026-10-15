import type { ReactElement } from 'react';

import { toSafeHref } from '@/utilities/safe-url.utility';

/** Body copy: a readable measure comes from the wrapper (about 70ch), rhythm comes from here. */
export function ThreadArticleParagraph({
  children,
  ...props
}: React.JSX.IntrinsicElements['p']): ReactElement {
  return (
    <p className="my-4 text-[1.0625rem] leading-8 break-words" {...props}>
      {children}
    </p>
  );
}

export function ThreadArticleList({
  children,
  ...props
}: React.JSX.IntrinsicElements['ul']): ReactElement {
  return (
    <ul
      className="marker:text-muted-foreground my-4 list-disc space-y-2 ps-6 leading-8 [&_ul]:my-2"
      {...props}
    >
      {children}
    </ul>
  );
}

export function ThreadArticleOrderedList({
  children,
  ...props
}: React.JSX.IntrinsicElements['ol']): ReactElement {
  return (
    <ol
      className="marker:text-muted-foreground my-4 list-decimal space-y-2 ps-6 leading-8 [&_ol]:my-2"
      {...props}
    >
      {children}
    </ol>
  );
}

export function ThreadArticleRule(): ReactElement {
  return <hr className="border-border my-10" />;
}

/** An ordinary quotation (a callout has its own component). */
export function ThreadArticleQuote({
  children,
  ...props
}: React.JSX.IntrinsicElements['blockquote']): ReactElement {
  return (
    <blockquote
      className="border-border text-muted-foreground my-6 border-s-4 ps-4 italic"
      {...props}
    >
      {children}
    </blockquote>
  );
}

/**
 * Links: a section link stays on the page; everything else must pass the scheme check or it
 * degrades to plain text, opens in a new tab and carries `nofollow ugc` (the text is generated and
 * cites outside sites, so it passes no ranking signal).
 */
export function ThreadArticleAnchor({
  children,
  href,
  ...props
}: React.JSX.IntrinsicElements['a']): ReactElement {
  const linkClass =
    'text-primary focus-visible:ring-ring break-words underline underline-offset-2 hover:no-underline focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none';
  if (href?.startsWith('#') === true) {
    return (
      <a href={href} className={linkClass} {...props}>
        {children}
      </a>
    );
  }
  const safeHref = toSafeHref(href);
  if (safeHref === null) {
    return <span>{children}</span>;
  }
  return (
    <a
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer nofollow ugc"
      className={linkClass}
      {...props}
    >
      {children}
    </a>
  );
}
