import { Info } from 'lucide-react';

import type { LiveNoticeBoxProps } from '@/types/live.types';

/** A plain informational note: an icon, a bold title and a few lines. */
export function LiveNoticeBox({ testId, title, lines }: LiveNoticeBoxProps): React.ReactElement {
  return (
    <div
      role="note"
      className="border-border bg-muted text-foreground flex gap-3 rounded-md border p-3"
      data-testid={testId}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="flex flex-col gap-1 text-sm">
        <p className="font-medium">{title}</p>
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}
