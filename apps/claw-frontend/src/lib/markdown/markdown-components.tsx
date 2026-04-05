import type { Components } from 'react-markdown';

function PreBlock({
  children,
  ...props
}: React.JSX.IntrinsicElements['pre']): React.JSX.Element {
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
      <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono" {...props}>
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
    <div className="overflow-x-auto my-2">
      <table className="min-w-full border-collapse border border-border text-sm" {...props}>
        {children}
      </table>
    </div>
  );
}

function TableHeader({
  children,
  ...props
}: React.JSX.IntrinsicElements['th']): React.JSX.Element {
  return (
    <th className="border border-border bg-muted px-3 py-2 text-start font-medium" {...props}>
      {children}
    </th>
  );
}

function TableCell({
  children,
  ...props
}: React.JSX.IntrinsicElements['td']): React.JSX.Element {
  return (
    <td className="border border-border px-3 py-2" {...props}>
      {children}
    </td>
  );
}

function Anchor({
  children,
  ...props
}: React.JSX.IntrinsicElements['a']): React.JSX.Element {
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
    <ul className="list-disc ps-6 my-2 space-y-1" {...props}>
      {children}
    </ul>
  );
}

function OrderedList({
  children,
  ...props
}: React.JSX.IntrinsicElements['ol']): React.JSX.Element {
  return (
    <ol className="list-decimal ps-6 my-2 space-y-1" {...props}>
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
      className="border-s-4 border-primary/30 ps-4 my-2 italic text-muted-foreground"
      {...props}
    >
      {children}
    </blockquote>
  );
}

function Heading1({
  children,
  ...props
}: React.JSX.IntrinsicElements['h1']): React.JSX.Element {
  return (
    <h1 className="text-xl font-bold mt-4 mb-2" {...props}>
      {children}
    </h1>
  );
}

function Heading2({
  children,
  ...props
}: React.JSX.IntrinsicElements['h2']): React.JSX.Element {
  return (
    <h2 className="text-lg font-bold mt-3 mb-2" {...props}>
      {children}
    </h2>
  );
}

function Heading3({
  children,
  ...props
}: React.JSX.IntrinsicElements['h3']): React.JSX.Element {
  return (
    <h3 className="text-base font-semibold mt-2 mb-1" {...props}>
      {children}
    </h3>
  );
}

function Paragraph({
  children,
  ...props
}: React.JSX.IntrinsicElements['p']): React.JSX.Element {
  return (
    <p className="my-1.5 leading-relaxed" {...props}>
      {children}
    </p>
  );
}

function HorizontalRule(props: React.JSX.IntrinsicElements['hr']): React.JSX.Element {
  return <hr className="my-4 border-border" {...props} />;
}

export const markdownComponents: Components = {
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
