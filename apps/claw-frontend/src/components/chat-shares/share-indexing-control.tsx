import { Switch } from '@/components/ui/switch';
import type { ShareIndexingControlProps } from '@/types';

/**
 * The secondary control: public vs. public-and-indexed.
 *
 * These are deliberately two decisions rather than one. "Anyone with the link can
 * read this" and "this may appear in Google results" are different risks, and
 * collapsing them into a single Public toggle would hide the second one.
 *
 * When the server refused indexing (safety scan or too little content) the switch
 * still reflects what the owner asked for, and `blockedReason` explains why it did
 * not take effect — silently flipping it back would read as a bug.
 */
export function ShareIndexingControl({
  label,
  description,
  allowIndexing,
  onToggle,
  isPending,
  blockedReason,
  switchId,
}: ShareIndexingControlProps): React.ReactElement {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
      <div className="min-w-0">
        <label htmlFor={switchId} className="text-sm font-medium">
          {label}
        </label>
        <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
        {blockedReason === null ? null : (
          <p className="mt-1 text-xs font-medium text-amber-600">{blockedReason}</p>
        )}
      </div>
      <Switch
        id={switchId}
        checked={allowIndexing}
        onCheckedChange={onToggle}
        disabled={isPending}
      />
    </div>
  );
}
