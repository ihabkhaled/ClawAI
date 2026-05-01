'use client';

import { ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';

import { COMPAT_BADGE_TONE } from '@/constants/local-frontier.constants';
import { HardwareCompat } from '@/enums/local-frontier.enum';
import { cn } from '@/lib/utils';

interface HardwareCompatChipProps {
  chip: HardwareCompat;
  label: string;
}

export function HardwareCompatChip({ chip, label }: HardwareCompatChipProps): React.ReactElement {
  const tone = COMPAT_BADGE_TONE[chip] ?? COMPAT_BADGE_TONE['WARNS'];
  const Icon =
    chip === HardwareCompat.FITS
      ? ShieldCheck
      : (chip === HardwareCompat.REFUSES
        ? ShieldX
        : ShieldAlert);
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium', tone)}
      role="status"
      aria-label={label}
    >
      <Icon className="size-3" aria-hidden />
      {label}
    </span>
  );
}
