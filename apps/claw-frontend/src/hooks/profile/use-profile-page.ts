'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

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
    // A username change keeps this session, so the saved profile is refetched in
    // place. Only the password field is cleared, because the rest of the form is
    // reset from the refreshed user.
    onSuccess: () => {
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
