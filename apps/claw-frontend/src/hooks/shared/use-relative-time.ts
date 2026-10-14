import { useCallback, useSyncExternalStore } from 'react';

import { useTranslation } from '@/lib/i18n';
import type { UseRelativeTimeResult } from '@/types/relative-time.types';
import {
  subscribeNever,
  subscribeRelativeTime,
  throttleByAge,
} from '@/utilities/relative-time-ticker.utility';
import {
  formatFullDateTime,
  formatRelativeTime,
  formatStableUtcDate,
  formatStableUtcDateTime,
  toUtcIsoString,
} from '@/utilities/relative-time.utility';

/**
 * Label, tooltip and `datetime` for a stored UTC instant. Server render and hydration get the
 * zone-independent UTC text; once mounted the label turns relative ("5 minutes ago") in the
 * app locale, the title shows the full date in the visitor's own time zone, and the label
 * refreshes from the single shared ticker.
 */
export function useRelativeTime(iso: string): UseRelativeTimeResult {
  const { t, locale } = useTranslation();
  const justNowLabel = t('threadTime.justNow');

  const subscribe = useCallback(
    (onChange: () => void) => subscribeRelativeTime(throttleByAge(iso, onChange)),
    [iso],
  );
  const label = useSyncExternalStore(
    subscribe,
    () => formatRelativeTime({ iso, nowMs: Date.now(), locale, justNowLabel }),
    () => formatStableUtcDate(iso),
  );
  const title = useSyncExternalStore(
    subscribeNever,
    () => formatFullDateTime(iso, locale),
    () => formatStableUtcDateTime(iso),
  );

  return { label, title, dateTime: toUtcIsoString(iso) };
}
