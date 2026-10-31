'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { AccessDenied } from '@/components/admin/access-denied';
import { SessionActionDialog } from '@/components/admin/sessions/session-action-dialog';
import { SessionStateFilter } from '@/components/admin/sessions/session-state-filter';
import { UserSessionsSummary } from '@/components/admin/sessions/user-sessions-summary';
import { UserSessionsTable } from '@/components/admin/sessions/user-sessions-table';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { ROUTES } from '@/constants';
import { useUserSessionsRoute } from '@/hooks/admin/use-user-sessions-route';
import { countInactiveSessions } from '@/utilities/admin-sessions.utility';

export default function AdminUserSessionsPage(): ReactElement {
  const page = useUserSessionsRoute();
  const { t } = page;

  if (!page.isAdmin) {
    return <AccessDenied t={t} />;
  }

  let content: ReactElement;
  if (page.isLoading) {
    content = <p>{t('adminSessions.loading')}</p>;
  } else if (page.isError) {
    content = (
      <div role="alert" className="text-destructive">
        <p>{t('adminSessions.loadFailed')}</p>
        <Button onClick={page.retry} variant="outline" className="mt-2">
          {t('common.retry')}
        </Button>
      </div>
    );
  } else if (page.sessions.length === 0) {
    content = <p data-testid="sessions-empty">{t('adminSessions.empty')}</p>;
  } else {
    content = (
      <>
        <UserSessionsTable
          sessions={page.sessions}
          locale={page.locale}
          isActing={page.isActing}
          onTerminate={(session) => page.openTarget({ kind: 'terminate-one', session })}
          onClear={(session) => page.openTarget({ kind: 'clear-one', session })}
          t={t}
        />
        <Pagination
          page={page.page}
          pageSize={page.pageSize}
          totalPages={page.meta.totalPages}
          totalItems={page.meta.total}
          onPageChange={page.setPage}
          onPageSizeChange={page.setPageSize}
          t={t}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href={ROUTES.ADMIN_USERS}>
          <ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          {t('adminSessions.backToUsers')}
        </Link>
      </Button>
      <PageHeader
        title={t('adminSessions.title')}
        description={
          page.username === null
            ? t('adminSessions.description')
            : t('adminSessions.descriptionFor', { username: page.username })
        }
        actions={
          <>
            <Button
              type="button"
              variant="destructive"
              disabled={page.summary.active === 0 || page.isActing}
              onClick={() => page.openTarget({ kind: 'terminate-all' })}
              data-testid="terminate-all-button"
            >
              {t('adminSessions.terminateAll')}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={countInactiveSessions(page.summary) === 0 || page.isActing}
              onClick={() => page.openTarget({ kind: 'clear-all' })}
              data-testid="clear-all-button"
            >
              {t('adminSessions.clearAll')}
            </Button>
          </>
        }
      />
      <UserSessionsSummary summary={page.summary} t={t} />
      <SessionStateFilter value={page.stateFilter} onChange={page.setStateFilter} t={t} />
      {content}
      <SessionActionDialog
        target={page.target}
        isOwnAccount={page.isOwnAccount}
        isActing={page.isActing}
        onConfirm={() => void page.confirmTarget()}
        onClose={page.closeTarget}
        t={t}
      />
    </div>
  );
}
