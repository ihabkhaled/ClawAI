'use client';

import type { ChangeEvent, FormEvent, ReactElement } from 'react';

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
import { ArchivePasswordPromptStatus } from '@/enums/archive-password-prompt-status.enum';
import type { ArchivePasswordDialogProps } from '@/types/archive.types';

/**
 * The in-chat password prompt for an archive attached to a message that came
 * back ARCHIVE_ENCRYPTED. Same shape as `MediaRecordingConsentDialog` — a
 * controlled `Dialog`, a `data-testid` per part, Cancel/primary footer —
 * reused for consistency with the one other inline-prompt already in chat,
 * rather than inventing a second pattern.
 *
 * Bounded by the server's retry cap: once `submit`'s mutation answers
 * ARCHIVE_PASSWORD_ATTEMPTS_EXCEEDED, `status` becomes AttemptsExceeded and
 * the input/submit button are replaced by a terminal message — no further
 * password entry is offered, so a wrong password cannot be retried forever.
 */
export function ArchivePasswordDialog({
  open,
  status,
  password,
  onPasswordChange,
  onOpenChange,
  onSubmit,
  t,
}: ArchivePasswordDialogProps): ReactElement {
  const isExceeded = status === ArchivePasswordPromptStatus.AttemptsExceeded;
  const isSubmitting = status === ArchivePasswordPromptStatus.Submitting;

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onPasswordChange(event.target.value);
  };

  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" data-testid="archive-password-dialog">
        <DialogHeader>
          <DialogTitle>
            {t(
              isExceeded
                ? 'files.archive.password.attemptsExceededTitle'
                : 'files.archive.password.title',
            )}
          </DialogTitle>
          <DialogDescription data-testid="archive-password-description">
            {t(
              isExceeded
                ? 'files.archive.password.attemptsExceeded'
                : 'files.archive.password.description',
            )}
          </DialogDescription>
        </DialogHeader>

        {isExceeded ? null : (
          <form onSubmit={handleSubmit} className="space-y-2">
            <Input
              type="password"
              autoComplete="off"
              value={password}
              disabled={isSubmitting}
              placeholder={t('files.archive.password.placeholder')}
              onChange={handleChange}
              data-testid="archive-password-input"
            />
            {status === ArchivePasswordPromptStatus.WrongPassword ? (
              <p
                className="text-destructive text-sm"
                role="alert"
                data-testid="archive-password-error"
              >
                {t('files.archive.password.wrongPassword')}
              </p>
            ) : null}
            {status === ArchivePasswordPromptStatus.Error ? (
              <p
                className="text-destructive text-sm"
                role="alert"
                data-testid="archive-password-error"
              >
                {t('files.archive.password.genericError')}
              </p>
            ) : null}
          </form>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
            }}
            data-testid="archive-password-cancel"
          >
            {t('files.archive.password.cancel')}
          </Button>
          {isExceeded ? null : (
            <Button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting || password.length === 0}
              data-testid="archive-password-submit"
            >
              {t(
                isSubmitting
                  ? 'files.archive.password.submitting'
                  : 'files.archive.password.submit',
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
