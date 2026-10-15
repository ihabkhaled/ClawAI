import type { ReactElement } from 'react';

/**
 * A GitHub-style table that scrolls inside its own box on a narrow screen (never the page), keeps
 * its header row in view while the box scrolls, and stripes the rows. Columns follow the reading
 * direction (`text-start`), so an Arabic table mirrors.
 */
export function ThreadArticleTable({
  children,
  ...props
}: React.JSX.IntrinsicElements['table']): ReactElement {
  return (
    <div
      className="border-border my-6 max-h-[32rem] break-inside-avoid overflow-auto rounded-lg border"
      data-thread-table
    >
      <table
        className="[&_tbody_tr:nth-child(even)]:bg-muted/50 [&_th]:bg-muted min-w-full border-collapse text-sm [&_td]:border-b [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_th]:sticky [&_th]:top-0 [&_th]:border-b [&_th]:px-3 [&_th]:py-2 [&_th]:text-start [&_th]:font-semibold"
        {...props}
      >
        {children}
      </table>
    </div>
  );
}
