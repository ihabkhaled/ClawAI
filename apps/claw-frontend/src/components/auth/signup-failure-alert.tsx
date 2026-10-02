import { Copy } from 'lucide-react';
import Link from 'next/link';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertVariant } from '@/enums/alert-variant.enum';
import type { SignupFailureAlertProps } from '@/types/component.types';

/**
 * The single place a failed sign-up is explained.
 *
 * What happened and what to do, in the reader's language, chosen from the
 * error CODE — never the backend's English message (rule 43 §2). A taken
 * address gets the two ways out that actually help; a fault on our side gets
 * the request reference, small and copyable, so a support ticket can name the
 * one log line behind it. No toast repeats any of this.
 */
export function SignupFailureAlert({
  copy,
  requestId,
  onCopyRequestId,
  signInHref,
  resetPasswordHref,
  t,
}: SignupFailureAlertProps): React.ReactElement {
  return (
    <Alert
      variant={AlertVariant.Error}
      title={t(copy.titleKey)}
      description={
        <div className="space-y-2">
          <p>{t(copy.descriptionKey)}</p>
          {copy.offersSignIn ? (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <Link href={signInHref} className="text-primary font-medium hover:underline">
                {t('auth.signup.actionSignIn')}
              </Link>
              <Link href={resetPasswordHref} className="text-primary font-medium hover:underline">
                {t('auth.signup.actionResetPassword')}
              </Link>
            </div>
          ) : null}
          {requestId === null ? null : (
            <div className="text-muted-foreground flex items-center gap-1 text-xs">
              <span className="min-w-0 break-all" dir="ltr">
                {t('auth.signup.requestIdLabel', { id: requestId })}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={onCopyRequestId}
                aria-label={t('auth.signup.copyRequestId')}
                title={t('auth.signup.copyRequestId')}
              >
                <Copy aria-hidden="true" className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      }
    />
  );
}
