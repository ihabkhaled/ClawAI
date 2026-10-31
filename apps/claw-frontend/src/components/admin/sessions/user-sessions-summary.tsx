import type { ReactElement } from 'react';

import type { UserSessionsSummaryProps } from '@/types/admin-sessions.types';

/** Four small counters above the table; deliberately not a card grid, to keep the page quiet. */
export function UserSessionsSummary({ summary, t }: UserSessionsSummaryProps): ReactElement {
  return (
    <dl
      className="text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-1 text-sm"
      data-testid="sessions-summary"
    >
      <div className="flex items-baseline gap-1.5">
        <dt>{t('adminSessions.stateActive')}</dt>
        <dd className="text-foreground font-semibold" data-testid="summary-active">
          {summary.active}
        </dd>
      </div>
      <div className="flex items-baseline gap-1.5">
        <dt>{t('adminSessions.stateExpired')}</dt>
        <dd className="text-foreground font-semibold" data-testid="summary-expired">
          {summary.expired}
        </dd>
      </div>
      <div className="flex items-baseline gap-1.5">
        <dt>{t('adminSessions.stateTerminated')}</dt>
        <dd className="text-foreground font-semibold" data-testid="summary-terminated">
          {summary.terminated}
        </dd>
      </div>
      <div className="flex items-baseline gap-1.5">
        <dt>{t('adminSessions.total')}</dt>
        <dd className="text-foreground font-semibold" data-testid="summary-total">
          {summary.total}
        </dd>
      </div>
    </dl>
  );
}
