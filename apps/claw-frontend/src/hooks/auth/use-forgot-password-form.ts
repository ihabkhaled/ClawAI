import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { useTranslation } from '@/lib/i18n';
import { forgotPasswordSchema } from '@/lib/validation/password-reset.schema';
import type { ForgotPasswordFormValues } from '@/lib/validation/password-reset.schema';
import { authService } from '@/services/auth/auth.service';
import type { UseForgotPasswordFormReturn } from '@/types/hook.types';

export function useForgotPasswordForm(): UseForgotPasswordFormReturn {
  const { t } = useTranslation();
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState<string | null>(null);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: ForgotPasswordFormValues) => authService.requestPasswordReset(values),
    onSuccess: () => {
      // Deliberately identical success messaging regardless of whether
      // the email address exists. This prevents user enumeration.
      setForgotPasswordError(null);
      setHasSubmitted(true);
    },
    onError: () => {
      // Same as onSuccess — do NOT surface a different message for
      // non-existent addresses. Anti-enumeration requirement.
      setForgotPasswordError(t('auth.forgotPasswordErrorGeneric'));
    },
  });

  const onSubmit = useMemo(
    () => form.handleSubmit((values) => mutation.mutate(values)),
    [form, mutation],
  );

  return {
    form,
    onSubmit,
    isPending: mutation.isPending,
    isSuccess: hasSubmitted,
    errorMessage: forgotPasswordError,
    t,
  };
}
