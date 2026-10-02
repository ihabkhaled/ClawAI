import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { useTranslation } from '@/lib/i18n';
import { forgotPasswordSchema } from '@/lib/validation/password-reset.schema';
import type { ForgotPasswordFormValues } from '@/lib/validation/password-reset.schema';
import { authService } from '@/services/auth/auth.service';
import type { UseForgotPasswordFormReturn } from '@/types/hook.types';
import { translateRateLimitError } from '@/utilities/rate-limit.utility';

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
    onError: (error: Error) => {
      // Same as onSuccess — do NOT surface a different message for
      // non-existent addresses. Anti-enumeration requirement. A 429 is the one
      // exception, and it is safe: the per-IP limit is spent identically for
      // every address, so "try again in N minutes" reveals nothing (rules/58).
      setForgotPasswordError(
        translateRateLimitError(error, t) ?? t('auth.forgotPasswordErrorGeneric'),
      );
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
