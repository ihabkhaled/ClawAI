import { Check } from 'lucide-react';

import { ModelCostMark } from '@/components/chat/model-cost-mark';
import { Button } from '@/components/ui/button';
import type { ParallelModelRowViewProps } from '@/types';
import { cn } from '@/utilities';

/** One virtualised Compare row: a provider heading or a selectable model. */
export function ParallelModelRowView({
  row,
  isChecked,
  isDisabled,
  onToggle,
  lockedLabel,
}: ParallelModelRowViewProps): React.ReactElement {
  if (row.kind === 'group') {
    return (
      <p className="text-muted-foreground px-1 pt-3 pb-1.5 text-xs font-semibold uppercase first:pt-0">
        {row.label}
      </p>
    );
  }
  return (
    <div className="pb-1">
      <Button
        variant="ghost"
        size="sm"
        // A model outside the user's plan is dimmed and cannot be ticked. One credit would pay
        // for is only dimmed, like the single-model picker: it can still be ticked.
        disabled={isDisabled || row.model.isLocked === true}
        className={cn(
          'min-h-11 w-full min-w-0 justify-start gap-2 px-2 text-sm',
          isChecked && 'bg-accent',
          row.model.isLocked === true && 'opacity-50',
          row.model.isLocked !== true && row.model.outsideAllowance === true && 'opacity-60',
        )}
        onClick={() => onToggle(row.model.provider, row.model.model, !isChecked)}
      >
        <span
          className={cn(
            'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
            isChecked
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-muted-foreground',
          )}
        >
          {isChecked ? <Check className="h-3 w-3" /> : null}
        </span>
        <span
          className={cn(
            'truncate-fixed min-w-[4rem] text-start',
            row.model.scale === undefined && 'flex-1',
          )}
        >
          {row.model.displayName}
        </span>
        {/* The desktop Compare column is ~260px: the size is the part that clips first. */}
        {row.model.scale !== undefined ? (
          <span
            title={row.model.scale.title}
            data-testid="model-scale"
            dir="auto"
            className="text-muted-foreground truncate-fixed touch:text-xs min-w-0 flex-1 text-end text-[11px] leading-none"
          >
            {row.model.scale.label}
          </span>
        ) : null}
        {row.model.costClass !== undefined ? (
          <ModelCostMark
            costClass={row.model.costClass}
            outsideAllowance={row.model.outsideAllowance}
          />
        ) : null}
        {/* The desktop Compare column is ~260px: name, cost mark and this tag do not all fit,
            so the tag is the one that shrinks (ellipsis, full text in the tooltip). */}
        {row.model.isLocked === true ? (
          <span
            title={lockedLabel}
            className="border-border bg-muted text-muted-foreground truncate-fixed min-w-0 shrink rounded border px-1.5 py-0.5 text-[10px] leading-none"
          >
            {lockedLabel}
          </span>
        ) : null}
      </Button>
    </div>
  );
}
