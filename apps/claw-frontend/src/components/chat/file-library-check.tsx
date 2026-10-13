import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { FileLibraryCheckProps } from '@/types/file-library-ui.types';

/** The selection mark: an empty ring, or a filled primary disc with a tick. */
export function FileLibraryCheck({
  checked,
  className,
}: FileLibraryCheckProps): React.ReactElement {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
        checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
        className,
      )}
    >
      {checked ? <Check className="h-3 w-3" /> : null}
    </span>
  );
}
