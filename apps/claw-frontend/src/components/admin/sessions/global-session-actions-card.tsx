import { ShieldAlert } from 'lucide-react';
import type { ReactElement } from 'react';

import { GlobalSessionConfirmDialog } from '@/components/admin/sessions/global-session-confirm-dialog';
import { GlobalSessionPasswordDialog } from '@/components/admin/sessions/global-session-password-dialog';
import { Button } from '@/components/ui/button';
import { SessionGlobalAction } from '@/enums/session-global-action.enum';
import type { GlobalSessionDialogsProps } from '@/types/admin-sessions.types';

/** The security-incident buttons. Each opens the two-step guard; nothing happens on one click. */
export function GlobalSessionActionsCard({ guard, t }: GlobalSessionDialogsProps): ReactElement {
  return (
    <section
      aria-labelledby="global-sessions-danger"
      className="border-destructive/40 space-y-6 rounded-lg border p-4 sm:p-6"
      data-testid="global-sessions-card"
    >
      <h2
        id="global-sessions-danger"
        className="text-destructive flex items-center gap-2 text-lg font-semibold"
      >
        <ShieldAlert className="h-5 w-5" aria-hidden="true" />
        {t('adminSessions.dangerZone')}
      </h2>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h3 className="font-medium">{t('adminSessions.globalTerminateTitle')}</h3>
          <p className="text-muted-foreground text-sm">{t('adminSessions.globalTerminateBody')}</p>
        </div>
        <Button
          type="button"
          variant="destructive"
          onClick={() => guard.start(SessionGlobalAction.TERMINATE_ALL)}
          data-testid="global-terminate-button"
        >
          {t('adminSessions.globalTerminateButton')}
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h3 className="font-medium">{t('adminSessions.globalClearTitle')}</h3>
          <p className="text-muted-foreground text-sm">{t('adminSessions.globalClearBody')}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => guard.start(SessionGlobalAction.CLEAR_ALL_LOGS)}
          data-testid="global-clear-button"
        >
          {t('adminSessions.globalClearButton')}
        </Button>
      </div>

      <GlobalSessionPasswordDialog guard={guard} t={t} />
      <GlobalSessionConfirmDialog guard={guard} t={t} />
    </section>
  );
}
