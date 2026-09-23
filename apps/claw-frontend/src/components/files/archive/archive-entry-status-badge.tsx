import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ArchiveEntryStatusBadgeProps } from '@/types/archive.types';
import { getArchiveStatusPresentation } from '@/utilities/archive-status.utility';

// Icon AND words for every status: the icon's tone is a second cue, never the
// only one, so the label reads the same in greyscale and to a screen reader.
export function ArchiveEntryStatusBadge({
  status,
  t,
}: ArchiveEntryStatusBadgeProps): React.ReactElement {
  const presentation = getArchiveStatusPresentation(status);
  const Icon = presentation.icon;

  return (
    <Badge
      variant="outline"
      className="touch:text-xs text-foreground shrink-0 gap-1 px-1.5 py-0 text-[11px] font-normal"
      data-testid="archive-entry-status"
      data-status={status}
    >
      <Icon className={cn('h-3 w-3 shrink-0', presentation.iconClass)} aria-hidden="true" />
      {t(presentation.labelKey)}
    </Badge>
  );
}
