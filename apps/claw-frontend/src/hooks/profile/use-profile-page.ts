'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { ROUTES } from '@/constants';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useTranslation } from '@/lib/i18n';
import {
  profileIdentitySchema,
  type ProfileIdentityFormValues,
} from '@/lib/validation/profile.schema';
import { queryKeys } from '@/repositories/shared/query-keys';
import { authService } from '@/services/auth/auth.service';
import type { UpdateOwnProfileRequest, UseProfilePageReturn } from '@/types';
import { showToast } from '@/utilities';

export function useProfilePage(): UseProfilePageReturn {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading } = useCurrentUser();

  const form = useForm<ProfileIdentityFormValues>({
    resolver: zodResolver(profileIdentitySchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      username: '',
      currentPassword: '',
    },
  });

  useEffect(() => {
    if (!user) {
      return;
    }
    form.reset({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      phone: user.phone ?? '',
      username: user.username,
      currentPassword: '',
    });
  }, [form, user]);

  const mutation = useMutation({
    mutationFn: (data: UpdateOwnProfileRequest) => authService.updateOwnProfile(data),
    onSuccess: (_result, variables) => {
      // Only a username change ends every session, and authService clears the
      // local token in exactly that case, so the user has to sign in again.
      if (variables.username !== undefined) {
        queryClient.clear();
        router.push(ROUTES.LOGIN);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
      form.setValue('currentPassword', '');
      showToast.success({ title: t('profile.saved') });
    },
    onError: (error: unknown) => showToast.apiError(error, t('profile.saveFailed')),
  });

  return {
    form,
    t,
    isLoading,
    isSaving: mutation.isPending,
    email: user?.email ?? '',
    // A blank optional field clears the stored value, and the username is sent
    // only when it actually changed so an ordinary edit keeps the session.
    save: form.handleSubmit((data) =>
      mutation.mutate({
        currentPassword: data.currentPassword,
        firstName: data.firstName === '' ? null : data.firstName,
        lastName: data.lastName === '' ? null : data.lastName,
        phone: data.phone === '' ? null : data.phone,
        ...(user && data.username !== user.username ? { username: data.username } : {}),
      }),
    ),
  };
}
