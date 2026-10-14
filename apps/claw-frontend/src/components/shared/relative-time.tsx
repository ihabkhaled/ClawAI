'use client';

import type { ReactElement } from 'react';

import { useRelativeTime } from '@/hooks/shared/use-relative-time';
import type { RelativeTimeProps } from '@/types/relative-time.types';

/**
 * A stored UTC instant shown as a relative label in the visitor's language. The full local
 * date and time is the tooltip, and `datetime` carries the exact UTC instant for assistive
 * technology. Renders nothing for an invalid value.
 */
export function RelativeTime({ value, className }: RelativeTimeProps): ReactElement | null {
  const { label, title, dateTime } = useRelativeTime(value);
  if (dateTime === '') {
    return null;
  }
  return (
    <time dateTime={dateTime} title={title} className={className} data-testid="relative-time">
      {label}
    </time>
  );
}
