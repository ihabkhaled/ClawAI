import { cn } from '@/lib/utils';
import type { FileNameLabelProps } from '@/types/file-name.types';

/**
 * A file name on ONE clipped line on every screen, the full name on hover. `truncate-fixed`, not `truncate`: on touch
 * screens `truncate` wraps anywhere, which broke a long name into one syllable per line inside a fixed-height tile
 * (owner report 2026-11-28). The type icon beside it still says what kind of file it is.
 */
export function FileNameLabel({ filename, className }: FileNameLabelProps): React.ReactElement {
  return (
    <span className={cn('truncate-fixed block min-w-0', className)} title={filename} dir="auto">
      {filename}
    </span>
  );
}
