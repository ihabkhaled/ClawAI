import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { useTranslation } from '@/lib/i18n';
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from '@/lib/validation/password-reset.schema';
import { authService } from '@/services/auth/auth.service';
import type { UseResetPasswordFormReturn } from '@/types/hook.types';
import { logger } from '@/utilities';

export function useResetPasswordForm(): UseResetPasswordFormReturn {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isInvalidToken, setIsInvalidToken] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: ResetPasswordFormValues) =>
      authService.confirmPasswordReset({
        token: token ?? '',
        password: values.password,
      }),
    onSuccess: (response) => {
      if (response.reset) {
        setIsSuccess(true);
      } else {
        setErrorMessage(t('auth.resetPasswordErrorGeneric'));
      }
    },
    onError: () => {
      logger.error({
        component: 'auth',
        action: 'reset-password-error',
        message: 'Password reset failed',
      });
      setErrorMessage(t('auth.resetPasswordErrorGeneric'));
    },
  });

  useEffect(() => {
    if (!token) {
      setIsInvalidToken(true);
    }
  }, [token]);

  const onSubmit = useMemo(
    () =>
      form.handleSubmit((values) => {
        if (!token) {
          setIsInvalidToken(true);
          return;
        }
        mutation.mutate(values);
      }),
    [form, mutation, token],
  );

  return {
    form,
    onSubmit,
    isPending: mutation.isPending,
    isSuccess,
    isError: mutation.isError,
    isInvalidToken,
    errorMessage,
    t,
  };
}
