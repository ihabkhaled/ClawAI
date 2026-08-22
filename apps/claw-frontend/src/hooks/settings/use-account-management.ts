'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { ROUTES } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import {
  accountProfileSchema,
  deleteAccountSchema,
  type AccountProfileFormValues,
  type DeleteAccountFormValues,
} from '@/lib/validation/account-profile.schema';
import { authService } from '@/services/auth/auth.service';
import type { UserProfile } from '@/types';
import { showToast } from '@/utilities';

export function useAccountManagement(user: UserProfile | null | undefined) {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const profileForm = useForm<AccountProfileFormValues>({
    resolver: zodResolver(accountProfileSchema),
  });
  const deleteForm = useForm<DeleteAccountFormValues>({
    resolver: zodResolver(deleteAccountSchema),
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({ username: user.username, currentPassword: '' });
    }
  }, [profileForm, user]);

  const finishSession = (): void => {
    queryClient.clear();
    router.push(ROUTES.LOGIN);
  };
  const updateMutation = useMutation({
    mutationFn: (data: AccountProfileFormValues) => authService.updateOwnProfile(data),
    onSuccess: finishSession,
    onError: (error: unknown) => showToast.apiError(error, t('settings.profileUpdateFailed')),
  });
  const deleteMutation = useMutation({
    mutationFn: (data: DeleteAccountFormValues) => authService.deleteOwnAccount(data),
    onSuccess: finishSession,
    onError: (error: unknown) => showToast.apiError(error, t('settings.accountDeleteFailed')),
  });

  return {
    profileForm,
    deleteForm,
    updateProfile: profileForm.handleSubmit((data) => updateMutation.mutate(data)),
    deleteAccount: deleteForm.handleSubmit((data) => deleteMutation.mutate(data)),
    isProfilePending: updateMutation.isPending,
    isDeletePending: deleteMutation.isPending,
  };
}
