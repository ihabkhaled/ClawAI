import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { SESSION_STATE_FILTER_OPTIONS } from '@/constants/admin-sessions.constants';
import type { SessionStateFilterProps } from '@/types/admin-sessions.types';

/** Filter by state: all / active / expired / ended. One is always selected. */
export function SessionStateFilter({ value, onChange, t }: SessionStateFilterProps): ReactElement {
  return (
    <div
      role="group"
      aria-label={t('adminSessions.filterLabel')}
      className="flex flex-wrap gap-2"
      data-testid="sessions-state-filter"
    >
      {SESSION_STATE_FILTER_OPTIONS.map((option) => (
        <Button
          key={option.value ?? 'all'}
          type="button"
          size="sm"
          variant={option.value === value ? 'default' : 'outline'}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {t(option.labelKey)}
        </Button>
      ))}
    </div>
  );
}
