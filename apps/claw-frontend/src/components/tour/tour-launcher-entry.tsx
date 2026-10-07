import { Check } from 'lucide-react';
import type { ReactElement } from 'react';

import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import type { TourLauncherEntryProps } from '@/types/tour.types';

/** One tour in the help menu: its name, what it covers, and whether it is already done. */
export function TourLauncherEntry({
  entry,
  startLabel,
  restartLabel,
  doneLabel,
  onStart,
}: TourLauncherEntryProps): ReactElement {
  return (
    <DropdownMenuItem
      onSelect={onStart}
      className="flex cursor-pointer flex-col items-start gap-0.5 py-2"
      data-testid={`tour-entry-${entry.id}`}
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span className="text-sm font-medium">{entry.title}</span>
        {entry.isCompleted ? (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <Check className="h-3 w-3" aria-hidden="true" />
            {doneLabel}
          </span>
        ) : null}
      </span>
      <span className="text-muted-foreground text-xs">{entry.description}</span>
      <span className="text-primary text-xs">{entry.isCompleted ? restartLabel : startLabel}</span>
    </DropdownMenuItem>
  );
}
