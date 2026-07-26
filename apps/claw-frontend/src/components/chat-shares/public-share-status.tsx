import { Badge } from '@/components/ui/badge';
import type { PublicShareStatusProps } from '@/types';

/**
 * What is currently published: visibility, snapshot version, message count, and
 * when the snapshot was last updated.
 *
 * `unpublishedNotice` is the important one. It appears when the private thread has
 * moved past the snapshot, which is exactly the state an owner misreads as "my
 * share is broken" — the newest messages are missing because they were never
 * published, not because something failed.
 */
export function PublicShareStatus({
  visibilityLabel,
  visibilityTone,
  snapshotLabel,
  lastUpdatedLabel,
  messageCountLabel,
  unpublishedNotice,
}: PublicShareStatusProps): React.ReactElement {
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={visibilityTone}>{visibilityLabel}</Badge>
        <span className="text-muted-foreground text-xs">{snapshotLabel}</span>
        <span className="text-muted-foreground text-xs">{messageCountLabel}</span>
      </div>
      <p className="text-muted-foreground text-xs">{lastUpdatedLabel}</p>
      {unpublishedNotice === null ? null : (
        <p className="text-xs font-medium text-amber-600">{unpublishedNotice}</p>
      )}
    </div>
  );
}
