'use client';

import type { ReactElement } from 'react';

import { cn } from '@/lib/utils';
import type { AdminFeedbackMetaItemProps } from '@/types/feedback-props.types';

// A label/value pair in the metadata grid. Long values wrap instead of being
// truncated: a URL or user agent cut off at the column edge told the admin
// nothing, which is the whole reason those fields are collected.
export function AdminFeedbackMetaItem({
  label,
  value,
  isMono = false,
}: AdminFeedbackMetaItemProps): ReactElement {
  return (
    <div className="min-w-0 space-y-1">
      <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
      <dd className={cn('text-sm break-words', isMono && 'font-mono text-xs')}>{value}</dd>
    </div>
  );
}
