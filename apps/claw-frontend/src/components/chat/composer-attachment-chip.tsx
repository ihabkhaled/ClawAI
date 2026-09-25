import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  COMPOSER_ATTACHMENT_PROBLEM_STATES,
  COMPOSER_ATTACHMENT_STATE_ICONS,
} from '@/constants/composer-attachment.constants';
import { ComposerAttachmentState } from '@/enums/composer-attachment-state.enum';
import { cn } from '@/lib/utils';
import type { ComposerAttachmentChipProps } from '@/types/composer-attachment.types';

/**
 * One attachment in the composer: glyph + file name + state WORD, and a second
 * line for a failure reason or the "still processing" note. The state is always
 * spelled out — the icon and the destructive tone only repeat it.
 */
export function ComposerAttachmentChip({
  chip,
  onRemove,
}: ComposerAttachmentChipProps): React.ReactElement {
  const Icon = COMPOSER_ATTACHMENT_STATE_ICONS[chip.state];
  const isProblem = COMPOSER_ATTACHMENT_PROBLEM_STATES.has(chip.state);

  return (
    <li
      className={cn(
        'bg-muted/40 flex max-w-full min-w-0 items-start gap-1.5 rounded-lg border py-1 ps-2 pe-1 text-xs sm:max-w-xs',
        isProblem ? 'border-destructive/50' : 'border-border',
      )}
      data-testid="composer-attachment-chip"
      data-state={chip.state}
    >
      <Icon
        className={cn(
          'mt-0.5 h-3.5 w-3.5 shrink-0',
          chip.state === ComposerAttachmentState.Uploading ? 'animate-spin' : null,
          isProblem ? 'text-destructive' : 'text-muted-foreground',
        )}
        aria-hidden="true"
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-baseline gap-1">
          <span className="min-w-0 truncate font-medium" title={chip.displayName}>
            {chip.displayName}
          </span>
          <span
            className={cn('shrink-0', isProblem ? 'text-destructive' : 'text-muted-foreground')}
            data-testid="composer-attachment-chip-state"
          >
            {chip.stateLabel}
          </span>
        </span>
        {chip.note === null ? null : (
          <span
            className={cn('break-words', isProblem ? 'text-destructive' : 'text-muted-foreground')}
            data-testid="composer-attachment-chip-note"
          >
            {chip.note}
          </span>
        )}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="touch:h-9 touch:w-9 h-6 w-6 shrink-0"
        onClick={() => onRemove(chip)}
        aria-label={chip.removeLabel}
        title={chip.removeLabel}
        data-testid="composer-attachment-chip-remove"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
    </li>
  );
}
