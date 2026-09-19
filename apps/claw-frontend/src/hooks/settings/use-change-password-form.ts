'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { useChangePassword } from '@/hooks/settings/use-change-password';
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from '@/lib/validation/change-password.schema';
import type { UseChangePasswordFormReturn } from '@/types/hook.types';
import { logger } from '@/utilities';

/**
 * The change-password form, shared by the settings page and the dedicated
 * forced-rotation page, so the policy and its validation live in one place.
 */
export function useChangePasswordForm(onChanged?: () => void): UseChangePasswordFormReturn {
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const { changePassword, isPending } = useChangePassword(() => {
    form.reset();
    onChanged?.();
  });

  function handleSubmit(values: ChangePasswordFormValues): void {
    logger.info({
      component: 'settings',
      action: 'submit-password-change',
      message: 'User submitting password change',
    });
    changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
  }

  return { form, handleSubmit, isPending };
}
