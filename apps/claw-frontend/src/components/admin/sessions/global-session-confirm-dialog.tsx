import type { FormEvent, ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { SessionGlobalAction } from '@/enums/session-global-action.enum';
import { SessionGlobalStep } from '@/enums/session-global-step.enum';
import type { GlobalSessionDialogsProps } from '@/types/admin-sessions.types';

/**
 * Step 2: "Are you sure?". The administrator types the phrase; the button stays disabled until
 * it matches exactly. The dialog says what is kept (the acting administrator's own login) and
 * how long the confirmation lasts.
 */
export function GlobalSessionConfirmDialog({ guard, t }: GlobalSessionDialogsProps): ReactElement {
  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void guard.submitConfirm();
  };
  const isTerminate = guard.action === SessionGlobalAction.TERMINATE_ALL;

  return (
    <Dialog open={guard.step === SessionGlobalStep.CONFIRM} onOpenChange={guard.cancel}>
      <DialogContent className="sm:max-w-md" data-testid="global-confirm-dialog">
        <DialogHeader>
          <DialogTitle>{t('adminSessions.confirmTitle')}</DialogTitle>
          <DialogDescription>
            {t(
              isTerminate ? 'adminSessions.confirmBodyTerminate' : 'adminSessions.confirmBodyClear',
            )}
          </DialogDescription>
        </DialogHeader>
        {isTerminate ? (
          <p
            className="bg-info-surface text-info rounded-md px-3 py-2 text-sm font-medium"
            data-testid="global-keeps-session"
          >
            {t('adminSessions.keepsYourSession')}
          </p>
        ) : null}
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="global-session-phrase" className="text-sm leading-none font-medium">
              {t('adminSessions.phraseLabel', { phrase: guard.expectedPhrase })}
            </label>
            <Input
              id="global-session-phrase"
              dir="ltr"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={guard.phrase}
              onChange={(event) => guard.setPhrase(event.target.value)}
              disabled={guard.isBusy}
            />
            <p className="text-muted-foreground text-xs" role="timer" aria-live="off">
              {t('adminSessions.expiresIn', { seconds: guard.secondsLeft })}
            </p>
          </div>
          <DialogFooter className="gap-2 pt-2 sm:justify-end sm:gap-0">
            <Button type="button" variant="outline" onClick={guard.cancel}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={guard.isBusy || !guard.isPhraseValid}
              data-testid="global-confirm-button"
            >
              {t(
                isTerminate
                  ? 'adminSessions.confirmTerminateButton'
                  : 'adminSessions.confirmClearButton',
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
