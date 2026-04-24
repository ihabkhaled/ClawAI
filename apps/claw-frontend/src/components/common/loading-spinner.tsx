import { Loader2 } from 'lucide-react';

import { SPINNER_SIZE_CLASSES } from '@/constants';
import { ComponentSize } from '@/enums';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { LoadingSpinnerProps } from '@/types';

export function LoadingSpinner({ className, size = ComponentSize.MD, label }: LoadingSpinnerProps) {
  const { t } = useTranslation();
  const resolvedLabel = label ?? t('common.loading');
  return (
    <div
      className={cn('flex min-h-[200px] flex-col items-center justify-center gap-3', className)}
      role="status"
      aria-label={resolvedLabel}
    >
      <Loader2 className={cn('animate-spin text-muted-foreground', SPINNER_SIZE_CLASSES[size])} />
      <p className="text-sm text-muted-foreground">{resolvedLabel}</p>
    </div>
  );
}
