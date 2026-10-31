import type { ReactElement } from 'react';

import { SessionStateBadge } from '@/components/admin/sessions/session-state-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { SessionState } from '@/enums/session-state.enum';
import type { UserSessionRowProps } from '@/types/admin-sessions.types';
import {
  canClearSessionLog,
  canTerminateSession,
  formatSessionClientLabel,
  formatSessionEndNote,
  resolveClientKindLabel,
  resolveDeviceKindLabel,
} from '@/utilities/admin-sessions.utility';
import {
  countryFlagEmoji,
  formatAdminTimestamp,
  formatCountryLabel,
  formatRegistrationIp,
} from '@/utilities/admin-user-management.utility';

/** One login. The login's own IP and agent are shown; refreshes never change them. */
export function UserSessionRow({
  session,
  locale,
  isActing,
  onTerminate,
  onClear,
  t,
}: UserSessionRowProps): ReactElement {
  const flag = countryFlagEmoji(session.countryCode);
  const endNote = formatSessionEndNote(session, t);

  return (
    <TableRow data-testid="session-row">
      <TableCell className="align-top">
        <div className="font-medium">{formatSessionClientLabel(session, t)}</div>
        <div className="text-muted-foreground text-xs">
          {resolveDeviceKindLabel(session.deviceKind, t)} -{' '}
          {resolveClientKindLabel(session.clientKind, t)}
        </div>
        {session.isCurrent ? (
          <Badge variant="info" className="mt-1" data-testid="session-current">
            {t('adminSessions.currentBadge')}
          </Badge>
        ) : null}
      </TableCell>
      <TableCell className="align-top">
        <div data-testid="session-ip" dir="ltr" className="text-start font-mono text-xs">
          {formatRegistrationIp(session.ipAddress)}
        </div>
        <div className="text-muted-foreground text-xs" data-testid="session-country">
          {session.countryCode === null
            ? t('adminSessions.unknownLocation')
            : `${flag === '' ? '' : `${flag} `}${formatCountryLabel(session.countryCode, locale)}`}
        </div>
      </TableCell>
      <TableCell className="align-top text-xs">
        <div>
          {t('adminSessions.loginAt', { date: formatAdminTimestamp(session.loginAt, locale) })}
        </div>
        <div className="text-muted-foreground">
          {t('adminSessions.lastUsed', { date: formatAdminTimestamp(session.lastUsedAt, locale) })}
        </div>
        <div className="text-muted-foreground hidden sm:block">
          {t(
            session.state === SessionState.EXPIRED
              ? 'adminSessions.expiredAt'
              : 'adminSessions.expiresAt',
            { date: formatAdminTimestamp(session.expiresAt, locale) },
          )}
        </div>
      </TableCell>
      <TableCell className="align-top">
        <SessionStateBadge state={session.state} t={t} />
        {endNote === null ? null : (
          <div className="text-muted-foreground mt-1 text-xs" data-testid="session-end-note">
            {endNote}
            <br />
            {formatAdminTimestamp(session.terminatedAt, locale)}
          </div>
        )}
      </TableCell>
      <TableCell className="text-end align-top">
        {canTerminateSession(session) ? (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={isActing}
            onClick={() => onTerminate(session)}
          >
            {t('adminSessions.terminate')}
          </Button>
        ) : null}
        {canClearSessionLog(session) ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isActing}
            onClick={() => onClear(session)}
          >
            {t('adminSessions.clearLog')}
          </Button>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
