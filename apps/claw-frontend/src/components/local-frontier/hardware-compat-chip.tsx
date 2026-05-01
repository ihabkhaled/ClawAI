'use client';

import { COMPAT_BADGE_TONE } from '@/constants/local-frontier.constants';
import { cn } from '@/lib/utils';
import type { HardwareCompatChipProps } from '@/types/local-frontier-ui.types';
import { pickCompatIcon } from '@/utilities/local-frontier-compat.utility';

export function HardwareCompatChip({ chip, label }: HardwareCompatChipProps): React.ReactElement {
  const tone = COMPAT_BADGE_TONE[chip] ?? COMPAT_BADGE_TONE['WARNS'];
  const Icon = pickCompatIcon(chip);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
        tone,
      )}
      role="status"
      aria-label={label}
    >
      <Icon className="size-3" aria-hidden />
      {label}
    </span>
  );
}
