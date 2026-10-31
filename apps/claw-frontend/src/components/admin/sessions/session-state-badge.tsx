import type { ReactElement } from 'react';

import { Badge } from '@/components/ui/badge';
import {
  SESSION_STATE_BADGE_VARIANTS,
  SESSION_STATE_LABEL_KEYS,
} from '@/constants/admin-sessions.constants';
import type { SessionStateBadgeProps } from '@/types/admin-sessions.types';

/** The state of one login as a coloured pill. The word carries the meaning; colour only helps. */
export function SessionStateBadge({ state, t }: SessionStateBadgeProps): ReactElement {
  return (
    <Badge variant={SESSION_STATE_BADGE_VARIANTS[state]} data-testid="session-state">
      {t(SESSION_STATE_LABEL_KEYS[state])}
    </Badge>
  );
}
