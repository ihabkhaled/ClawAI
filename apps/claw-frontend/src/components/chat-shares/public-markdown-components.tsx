import type { Components } from 'react-markdown';

import { toSafeHref } from '@/utilities/safe-url.utility';

/**
 * The component map for rendering a published chat message.
 *
 * Deliberately NOT the chat renderer's map. That one is for content the signed-in
 * author wrote and is about to read back; this one renders arbitrary text to
 * strangers on an indexable page, so it differs in three ways:
 *
 * 1. **Links are scheme-checked and get `nofollow ugc`.** The content is
 *    user-generated and unreviewed — passing our domain's ranking signal to
 *    whatever someone pasted would make published chats an SEO-spam vector. An
 *    unsafe scheme degrades to plain text rather than being silently dropped, so
 *    the reader still sees what the link said.
 * 2. **Images are not loaded.** A remote `<img>` on a public page is a tracking
 *    pixel that fires for every visitor and leaks their IP to a third party the
 *    owner never chose, and a private attachment URL must never be reused
 *    publicly. The alt text is rendered instead.
 * 3. **No `img`/`html` passthrough at all.** Raw HTML is off because this map is
 *    used without `rehype-raw`; there is no sanitiser to trust because nothing
 *    unsanitised is ever parsed.
 */

function PublicAnchor({
  children,
  href,
  ...props
}: React.JSX.IntrinsicElements['a']): React.JSX.Element {
  const safeHref = toSafeHref(href);
  if (safeHref === null) {
    // Degrade to text. The reader still sees the label; the browser has nothing
    // to navigate to.
    return <span>{children}</span>;
  }
  return (
    <a
      href={safeHref}
      target="_blank"
      // `nofollow ugc` because this is unreviewed user content; `noopener
      // noreferrer` because the new tab has no business holding a handle on this
      // one or learning where the visitor came from.
      rel="noopener noreferrer nofollow ugc"
      className="text-primary focus-visible:ring-ring break-words underline underline-offset-2 hover:no-underline focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
      {...props}
    >
      {children}
    </a>
  );
}

function PublicImagePlaceholder({ alt }: React.JSX.IntrinsicElements['img']): React.JSX.Element {
  return (
    <span className="border-border text-muted-foreground my-1 inline-block rounded border border-dashed px-2 py-1 text-xs">
      {alt !== undefined && alt.length > 0 ? alt : null}
    </span>
  );
}

function PublicPre({ children, ...props }: React.JSX.IntrinsicElements['pre']): React.JSX.Element {
  return (
    // `overflow-x-auto` on the block itself, not the page: a 400-character line
    // of minified JSON must scroll inside its own box rather than making the
    // whole document scroll sideways on a phone.
    <pre
      className="bg-muted my-2 overflow-x-auto rounded-lg p-3 text-[13px] leading-relaxed sm:p-4"
      {...props}
    >
      {children}
    </pre>
  );
}

function PublicCode({
  children,
  className,
  ...props
}: React.JSX.IntrinsicElements['code']): React.JSX.Element {
  if (className === undefined) {
    return (
      <code
        className="bg-muted rounded px-1.5 py-0.5 font-mono text-[0.85em] break-words"
        {...props}
      >
        {children}
      </code>
    );
  }
  return (
    <code className={className} {...props}>
      {children}
    </code>
  );
}

function PublicTable({
  children,
  ...props
}: React.JSX.IntrinsicElements['table']): React.JSX.Element {
  return (
    <div className="my-2 overflow-x-auto">
      <table className="border-border min-w-full border-collapse border text-sm" {...props}>
        {children}
      </table>
    </div>
  );
}

function PublicTableHeader({
  children,
  ...props
}: React.JSX.IntrinsicElements['th']): React.JSX.Element {
  return (
    <th className="border-border bg-muted border px-3 py-2 text-start font-medium" {...props}>
      {children}
    </th>
  );
}

function PublicTableCell({
  children,
  ...props
}: React.JSX.IntrinsicElements['td']): React.JSX.Element {
  return (
    <td className="border-border border px-3 py-2 align-top" {...props}>
      {children}
    </td>
  );
}

function PublicUnorderedList({
  children,
  ...props
}: React.JSX.IntrinsicElements['ul']): React.JSX.Element {
  return (
    <ul className="my-2 list-disc space-y-1 ps-6" {...props}>
      {children}
    </ul>
  );
}

function PublicOrderedList({
  children,
  ...props
}: React.JSX.IntrinsicElements['ol']): React.JSX.Element {
  return (
    <ol className="my-2 list-decimal space-y-1 ps-6" {...props}>
      {children}
    </ol>
  );
}

function PublicBlockQuote({
  children,
  ...props
}: React.JSX.IntrinsicElements['blockquote']): React.JSX.Element {
  return (
    <blockquote className="border-border text-muted-foreground my-2 border-s-2 ps-3" {...props}>
      {children}
    </blockquote>
  );
}

function PublicParagraph({
  children,
  ...props
}: React.JSX.IntrinsicElements['p']): React.JSX.Element {
  return (
    // `break-words` so a 300-character URL wraps instead of forcing the page to
    // scroll horizontally.
    <p className="my-2 leading-relaxed break-words" {...props}>
      {children}
    </p>
  );
}

// Headings inside a message start at h4: the page's own h1 is the chat title and
// each message already has an h3-level label, so a message that starts with "# "
// must not outrank the page title in the document outline a screen reader or a
// crawler builds.
function PublicHeading({
  children,
  ...props
}: React.JSX.IntrinsicElements['h4']): React.JSX.Element {
  return (
    <h4 className="mt-3 mb-1 text-base font-semibold" {...props}>
      {children}
    </h4>
  );
}

export const publicMarkdownComponents: Components = {
  a: PublicAnchor,
  img: PublicImagePlaceholder,
  pre: PublicPre,
  code: PublicCode,
  table: PublicTable,
  th: PublicTableHeader,
  td: PublicTableCell,
  ul: PublicUnorderedList,
  ol: PublicOrderedList,
  blockquote: PublicBlockQuote,
  p: PublicParagraph,
  h1: PublicHeading,
  h2: PublicHeading,
  h3: PublicHeading,
  h4: PublicHeading,
  h5: PublicHeading,
  h6: PublicHeading,
};
