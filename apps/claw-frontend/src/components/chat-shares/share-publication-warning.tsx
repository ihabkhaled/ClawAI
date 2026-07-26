import { AlertTriangle } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import type { SharePublicationWarningProps } from '@/types';

/**
 * The consequences of publishing, stated before it happens.
 *
 * Every bullet is here because it is something the owner cannot discover
 * afterwards: that no login is required, that search engines may index it, that
 * ads may appear, that disabling the share cannot evict it from a search cache,
 * and — the one people get wrong — that later messages are NOT published
 * automatically.
 *
 * The checkbox is unchecked and the publish button stays disabled until it is
 * ticked. A pre-ticked box would turn publishing a private conversation into a
 * mis-click.
 */
export function SharePublicationWarning({
  bullets,
  acknowledgeLabel,
  hasAcknowledged,
  onToggleAcknowledged,
  headingLabel,
}: SharePublicationWarningProps): React.ReactElement {
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{headingLabel}</h3>
          <ul className="text-muted-foreground mt-2 list-disc space-y-1 ps-4 text-xs">
            {bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </div>
      </div>
      <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm">
        <Checkbox
          checked={hasAcknowledged}
          onCheckedChange={onToggleAcknowledged}
          className="mt-0.5"
        />
        <span>{acknowledgeLabel}</span>
      </label>
    </div>
  );
}
