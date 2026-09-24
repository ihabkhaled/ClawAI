'use client';

import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TRIAL_BANNER_DISMISSAL_OPTIONS } from '@/constants/trial-banner-dismissal.constants';
import { useTranslation } from '@/lib/i18n';
import type { TrialBannerDismissMenuProps } from '@/types/trial-status.types';

/** The trial banner's close (X) control: snooze 1 day, snooze 7 days, or hide forever. */
export function TrialBannerDismissMenu({
  onDismiss,
}: TrialBannerDismissMenuProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground h-8 w-8 shrink-0 p-0"
          aria-label={t('trialStatus.dismiss')}
          title={t('trialStatus.dismiss')}
          data-testid="trial-banner-dismiss"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {TRIAL_BANNER_DISMISSAL_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.choice}
            onSelect={() => onDismiss(option.choice)}
            data-testid={`trial-banner-${option.choice}`}
          >
            {t(option.labelKey)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
