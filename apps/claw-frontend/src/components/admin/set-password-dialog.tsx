'use client';

import type { ReactElement } from 'react';

import { CopyButton } from '@/components/common/copy-button';
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
import { PasswordSetMode } from '@/enums/password-set-mode.enum';
import { useSetPasswordDialog } from '@/hooks/admin/use-set-password-dialog';
import type { SetPasswordDialogProps } from '@/types';

/**
 * Set a user's password by typing one or by asking the server to generate one.
 * A generated password is shown once, with a copy button, and dropped when the
 * dialog closes; the server stores only its hash.
 */
export function SetPasswordDialog({
  open,
  user,
  isSaving,
  onClose,
  onConfirm,
  t,
}: SetPasswordDialogProps): ReactElement {
  const { mode, setMode, form, generatedPassword, isDone, submit, reset } = useSetPasswordDialog(
    user,
    onConfirm,
    onClose,
  );
  const { errors, isValid } = form.formState;
  const isGenerate = mode === PasswordSetMode.GENERATE;

  if (!user) {
    return <Dialog open={false} onOpenChange={onClose} />;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('admin.setPasswordTitle', { username: user.username })}</DialogTitle>
          <DialogDescription>{t('admin.setPasswordDescription')}</DialogDescription>
        </DialogHeader>

        {isDone && generatedPassword !== null ? (
          <div className="space-y-3" data-testid="generated-password-panel">
            <p className="text-sm font-medium">{t('admin.setPasswordGeneratedTitle')}</p>
            <div className="border-border bg-muted flex items-center justify-between gap-2 rounded-md border p-3">
              <code className="font-mono text-sm break-all" data-testid="generated-password">
                {generatedPassword}
              </code>
              <CopyButton text={generatedPassword} label={t('admin.setPasswordCopy')} />
            </div>
            <p className="text-warning text-xs">{t('admin.setPasswordGeneratedWarning')}</p>
            <DialogFooter>
              <Button
                type="button"
                onClick={() => {
                  reset();
                  onClose();
                }}
              >
                {t('admin.setPasswordDone')}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="flex gap-2" role="radiogroup" aria-label={t('admin.setPasswordMode')}>
              <Button
                type="button"
                size="sm"
                role="radio"
                aria-checked={isGenerate}
                variant={isGenerate ? 'default' : 'outline'}
                onClick={() => setMode(PasswordSetMode.GENERATE)}
              >
                {t('admin.setPasswordModeGenerate')}
              </Button>
              <Button
                type="button"
                size="sm"
                role="radio"
                aria-checked={!isGenerate}
                variant={isGenerate ? 'outline' : 'default'}
                onClick={() => setMode(PasswordSetMode.MANUAL)}
              >
                {t('admin.setPasswordModeManual')}
              </Button>
            </div>

            {isGenerate ? (
              <p className="text-muted-foreground text-sm">{t('admin.setPasswordGenerateHint')}</p>
            ) : (
              <div className="space-y-2">
                <label htmlFor="set-password-value" className="text-sm leading-none font-medium">
                  {t('admin.setPasswordManualLabel')}
                </label>
                <Input
                  id="set-password-value"
                  type="password"
                  autoComplete="new-password"
                  error={Boolean(errors.password)}
                  {...form.register('password')}
                />
                <p
                  className={
                    errors.password ? 'text-destructive text-xs' : 'text-muted-foreground text-xs'
                  }
                >
                  {t('admin.setPasswordManualHint')}
                </p>
              </div>
            )}

            <DialogFooter className="gap-2 pt-2 sm:justify-end sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  reset();
                  onClose();
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSaving || (!isGenerate && !isValid)}>
                {isGenerate ? t('admin.setPasswordGenerateConfirm') : t('admin.setPasswordConfirm')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
