'use client';

import Link from 'next/link';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';
import { EmailVerificationOutcome } from '@/enums/email-verification-outcome.enum';
import { useVerifyEmailPage } from '@/hooks/auth/use-verify-email-page';
import { useTranslation } from '@/lib/i18n';
import { resolveEmailVerificationCopyKeys } from '@/utilities/email-verification-copy.utility';

export default function VerifyEmailPage(): React.ReactElement {
  const { outcome } = useVerifyEmailPage();
  const { t } = useTranslation();

  if (outcome === EmailVerificationOutcome.Pending) {
    return <LoadingSpinner label={t('common.loading')} />;
  }

  const copy = resolveEmailVerificationCopyKeys(outcome);

  return (
    <section className="mx-auto flex max-w-md flex-col gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">{t(copy.titleKey)}</h1>
      <p className="text-muted-foreground text-sm">{t(copy.bodyKey)}</p>
      <Button asChild>
        <Link href={ROUTES.LOGIN}>{t('auth.signInLink')}</Link>
      </Button>
    </section>
  );
}
