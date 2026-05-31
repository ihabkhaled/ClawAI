import { Activity, Shield } from 'lucide-react';

import { RecentAuditEventsList } from '@/components/admin/recent-audit-events-list';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import type { RecentAuditEventsBodyProps } from '@/types';

// Render-only helper component for the body of the RecentAuditEvents
// panel. Centralizes the loading / error / empty / list selection so the
// parent doesn't nest ternaries (ESLint no-nested-ternary) and so each
// state is testable independently.
export function RecentAuditEventsBody({
  isLoading,
  isError,
  events,
  t,
}: RecentAuditEventsBodyProps): React.ReactElement {
  if (isLoading) {
    return <LoadingSpinner label={t('admin.loadingAuditEvents')} />;
  }
  if (isError) {
    return (
      <EmptyState
        icon={Shield}
        title={t('admin.recentAuditEventsErrorTitle')}
        description={t('admin.recentAuditEventsErrorDesc')}
      />
    );
  }
  if (events.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title={t('admin.recentAuditEventsEmptyTitle')}
        description={t('admin.recentAuditEventsEmptyDesc')}
      />
    );
  }
  return <RecentAuditEventsList events={events} />;
}
