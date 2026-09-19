'use client';

import { useRouter } from 'next/navigation';

import { ROUTES } from '@/constants';
import { useChangePasswordForm } from '@/hooks/settings/use-change-password-form';
import { useTranslation } from '@/lib/i18n';
import type { UseChangePasswordPageReturn } from '@/types/hook.types';

/**
 * The page an administrator-forced password rotation lands on.
 *
 * It used to land on the whole settings page, where the change form is one
 * card among many and users could not find what they were being asked to do.
 * This page shows only that form, and once the password is changed it sends
 * the user on to the product instead of leaving them on a settings screen.
 */
export function useChangePasswordPage(): UseChangePasswordPageReturn {
  const router = useRouter();
  const { t } = useTranslation();
  const passwordForm = useChangePasswordForm(() => {
    router.replace(ROUTES.CHAT);
  });
  return { ...passwordForm, t };
}
