import type { ReactElement } from 'react';

import {
  PRESENCE_STATE_DOT_CLASSES,
  PRESENCE_STATE_LABEL_KEYS,
} from '@/constants/admin-user-management.constants';
import { cn } from '@/lib/utils';
import type { UserPresenceDotProps } from '@/types';

/** A coloured dot: green online now, amber seen in the last 24 hours, grey offline. Labelled for screen readers. */
export function UserPresenceDot({ state, t }: UserPresenceDotProps): ReactElement {
  const label = t(PRESENCE_STATE_LABEL_KEYS[state]);
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      data-presence={state}
      className={cn(
        'inline-block h-2.5 w-2.5 shrink-0 rounded-full',
        PRESENCE_STATE_DOT_CLASSES[state],
      )}
    />
  );
}
