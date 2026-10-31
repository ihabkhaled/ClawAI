import type { ReactElement } from 'react';

import { UserSessionRow } from '@/components/admin/sessions/user-session-row';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { UserSessionsTableProps } from '@/types/admin-sessions.types';

/** Compact table of one user's logins, newest activity first. */
export function UserSessionsTable({
  sessions,
  locale,
  isActing,
  onTerminate,
  onClear,
  t,
}: UserSessionsTableProps): ReactElement {
  return (
    <Table data-testid="sessions-table">
      <TableHeader>
        <TableRow>
          <TableHead>{t('adminSessions.colDevice')}</TableHead>
          <TableHead>{t('adminSessions.colLocation')}</TableHead>
          <TableHead>{t('adminSessions.colActivity')}</TableHead>
          <TableHead>{t('adminSessions.colStatus')}</TableHead>
          <TableHead className="text-end">{t('adminSessions.colActions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((session) => (
          <UserSessionRow
            key={session.familyId}
            session={session}
            locale={locale}
            isActing={isActing}
            onTerminate={onTerminate}
            onClear={onClear}
            t={t}
          />
        ))}
      </TableBody>
    </Table>
  );
}
