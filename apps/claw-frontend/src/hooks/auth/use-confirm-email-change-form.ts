import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useTranslation } from '@/lib/i18n';
import { emailChangeService } from '@/services/auth/email-change.service';
import type { UseConfirmEmailChangeFormReturn } from '@/types/hook.types';
import { logger } from '@/utilities';

export function useConfirmEmailChangeForm(): UseConfirmEmailChangeFormReturn {
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const token = searchParams.get('token');

  const [isInvalidToken, setIsInvalidToken] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsInvalidToken(!token);
  }, [token]);

  const confirmMutation = useMutation({
    mutationFn: () => emailChangeService.confirm({ token: token ?? '' }),
    onSuccess: (response) => {
      if (response.changed) {
        setIsSuccess(true);
      } else {
        setErrorMessage(t('auth.confirmEmailChangeInvalidToken'));
      }
    },
    onError: () => {
      logger.error({
        component: 'auth',
        action: 'confirm-email-change-error',
        message: 'Email change confirmation failed',
      });
      setErrorMessage(t('auth.confirmEmailChangeInvalidToken'));
    },
  });

  const onSubmit = useCallback(
    async (event?: React.BaseSyntheticEvent): Promise<void> => {
      event?.preventDefault();
      if (isInvalidToken) {
        return;
      }
      confirmMutation.mutate();
    },
    [confirmMutation, isInvalidToken],
  );

  return useMemo(
    () => ({
      t,
      onSubmit,
      isPending: confirmMutation.isPending,
      isSuccess,
      isError: confirmMutation.isError,
      isInvalidToken,
      errorMessage,
    }),
    [
      t,
      onSubmit,
      confirmMutation.isPending,
      confirmMutation.isError,
      isSuccess,
      isInvalidToken,
      errorMessage,
    ],
  );
}
