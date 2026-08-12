'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { useTranslation } from '@/lib/i18n';
import { authRepository } from '@/repositories/auth/auth.repository';

export default function VerifyEmailPage(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      router.replace('/login');
      return;
    }
    void authRepository.verifyEmail(token).finally(() => router.replace('/login'));
  }, [router, searchParams]);

  return <LoadingSpinner label={t('common.loading')} />;
}
