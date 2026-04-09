import { Download } from 'lucide-react';
import type { Components } from 'react-markdown';

import { API_BASE_URL } from '@/constants';


function PreBlock({ children, ...props }: React.JSX.IntrinsicElements['pre']): React.JSX.Element {
  return (
    <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm" {...props}>
      {children}
    </pre>
  );
}

function CodeBlock({
  children,
  className,
  ...props
}: React.JSX.IntrinsicElements['code']): React.JSX.Element {
  const isInline = !className;
  if (isInline) {
    return (
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm" {...props}>
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

function TableWrapper({
  children,
  ...props
}: React.JSX.IntrinsicElements['table']): React.JSX.Element {
  return (
    <div className="my-2 overflow-x-auto">
      <table className="min-w-full border-collapse border border-border text-sm" {...props}>
        {children}
      </table>
    </div>
  );
}

function TableHeader({ children, ...props }: React.JSX.IntrinsicElements['th']): React.JSX.Element {
  return (
    <th className="border border-border bg-muted px-3 py-2 text-start font-medium" {...props}>
      {children}
    </th>
  );
}

function TableCell({ children, ...props }: React.JSX.IntrinsicElements['td']): React.JSX.Element {
  return (
    <td className="border border-border px-3 py-2" {...props}>
      {children}
    </td>
  );
}

function Anchor({ children, ...props }: React.JSX.IntrinsicElements['a']): React.JSX.Element {
  return (
    <a
      className="text-primary underline hover:no-underline"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  );
}

function UnorderedList({
  children,
  ...props
}: React.JSX.IntrinsicElements['ul']): React.JSX.Element {
  return (
    <ul className="my-2 list-disc space-y-1 ps-6" {...props}>
      {children}
    </ul>
  );
}

function OrderedList({ children, ...props }: React.JSX.IntrinsicElements['ol']): React.JSX.Element {
  return (
    <ol className="my-2 list-decimal space-y-1 ps-6" {...props}>
      {children}
    </ol>
  );
}

function BlockQuote({
  children,
  ...props
}: React.JSX.IntrinsicElements['blockquote']): React.JSX.Element {
  return (
    <blockquote
      className="my-2 border-s-4 border-primary/30 ps-4 italic text-muted-foreground"
      {...props}
    >
      {children}
    </blockquote>
  );
}

function Heading1({ children, ...props }: React.JSX.IntrinsicElements['h1']): React.JSX.Element {
  return (
    <h1 className="mb-2 mt-4 text-xl font-bold" {...props}>
      {children}
    </h1>
  );
}

function Heading2({ children, ...props }: React.JSX.IntrinsicElements['h2']): React.JSX.Element {
  return (
    <h2 className="mb-2 mt-3 text-lg font-bold" {...props}>
      {children}
    </h2>
  );
}

function Heading3({ children, ...props }: React.JSX.IntrinsicElements['h3']): React.JSX.Element {
  return (
    <h3 className="mb-1 mt-2 text-base font-semibold" {...props}>
      {children}
    </h3>
  );
}

function Paragraph({ children, ...props }: React.JSX.IntrinsicElements['p']): React.JSX.Element {
  return (
    <p className="my-1.5 leading-relaxed" {...props}>
      {children}
    </p>
  );
}

function HorizontalRule(props: React.JSX.IntrinsicElements['hr']): React.JSX.Element {
  return <hr className="my-4 border-border" {...props} />;
}

function ImageBlock({ src, alt, ...props }: React.JSX.IntrinsicElements['img']): React.JSX.Element {
  const srcStr = typeof src === 'string' ? src : undefined;
  const resolvedSrc = srcStr?.startsWith('/api/')
    ? `${API_BASE_URL.replace('/api/v1', '')}${srcStr}`
    : srcStr;
  const downloadUrl = resolvedSrc;

  return (
    <span className="my-2 block">
      <span className="group relative inline-block">
        <img
          src={resolvedSrc}
          alt={alt ?? 'Generated image'}
          className="max-h-[512px] max-w-full rounded-lg border border-border"
          loading="lazy"
          {...props}
        />
        {downloadUrl ? (
          <a
            href={downloadUrl}
            download
            className="absolute end-2 top-2 rounded-md bg-background/80 p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
            title="Download image"
          >
            <Download className="h-4 w-4" />
          </a>
        ) : null}
      </span>
    </span>
  );
}

export const markdownComponents: Components = {
  img: ImageBlock,
  pre: PreBlock,
  code: CodeBlock,
  table: TableWrapper,
  th: TableHeader,
  td: TableCell,
  a: Anchor,
  ul: UnorderedList,
  ol: OrderedList,
  blockquote: BlockQuote,
  h1: Heading1,
  h2: Heading2,
  h3: Heading3,
  p: Paragraph,
  hr: HorizontalRule,
};
