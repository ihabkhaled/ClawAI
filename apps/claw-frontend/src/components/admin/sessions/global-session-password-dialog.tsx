import type { FormEvent, ReactElement } from 'react';

import { PasswordInput } from '@/components/common/password-input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SESSION_GLOBAL_PASSWORD_MAX_LENGTH } from '@/constants/admin-sessions.constants';
import { SessionGlobalAction } from '@/enums/session-global-action.enum';
import { SessionGlobalStep } from '@/enums/session-global-step.enum';
import type { GlobalSessionDialogsProps } from '@/types/admin-sessions.types';

/** Step 1 of a system-wide action: the administrator proves who they are with their own password. */
export function GlobalSessionPasswordDialog({ guard, t }: GlobalSessionDialogsProps): ReactElement {
  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void guard.submitPassword();
  };
  const isTerminate = guard.action === SessionGlobalAction.TERMINATE_ALL;

  return (
    <Dialog open={guard.step === SessionGlobalStep.PASSWORD} onOpenChange={guard.cancel}>
      <DialogContent className="sm:max-w-md" data-testid="global-password-dialog">
        <DialogHeader>
          <DialogTitle>{t('adminSessions.passwordTitle')}</DialogTitle>
          <DialogDescription>
            {t(
              isTerminate
                ? 'adminSessions.passwordBodyTerminate'
                : 'adminSessions.passwordBodyClear',
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="global-session-password" className="text-sm leading-none font-medium">
              {t('adminSessions.passwordLabel')}
            </label>
            <PasswordInput
              id="global-session-password"
              autoComplete="current-password"
              maxLength={SESSION_GLOBAL_PASSWORD_MAX_LENGTH}
              value={guard.password}
              onChange={(event) => guard.setPassword(event.target.value)}
              disabled={guard.isBusy}
            />
          </div>
          <DialogFooter className="gap-2 pt-2 sm:justify-end sm:gap-0">
            <Button type="button" variant="outline" onClick={guard.cancel}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={guard.isBusy || guard.password === ''}>
              {t('adminSessions.passwordContinue')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
