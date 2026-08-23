'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import {
  adminUserEditSchema,
  type AdminUserEditFormValues,
} from '@/lib/validation/admin-user.schema';
import type { AdminUser, AdminUserUpdateRequest, UseEditUserFormReturn } from '@/types';

const EMPTY_VALUES: AdminUserEditFormValues = { username: '', firstName: '', lastName: '' };

export function useEditUserForm(
  user: AdminUser | null,
  onSave: (userId: string, data: AdminUserUpdateRequest) => void,
): UseEditUserFormReturn {
  const form = useForm<AdminUserEditFormValues>({
    resolver: zodResolver(adminUserEditSchema),
    mode: 'onChange',
    defaultValues: EMPTY_VALUES,
  });

  // The dialog stays mounted between rows, so the form is refilled whenever the
  // selected user changes rather than only on first render.
  useEffect(() => {
    form.reset(
      user
        ? {
            username: user.username,
            firstName: user.firstName ?? '',
            lastName: user.lastName ?? '',
          }
        : EMPTY_VALUES,
    );
  }, [form, user]);

  return {
    form,
    submit: form.handleSubmit((values) => {
      if (!user) {
        return;
      }
      onSave(user.id, {
        username: values.username,
        firstName: values.firstName === '' ? null : values.firstName,
        lastName: values.lastName === '' ? null : values.lastName,
      });
    }),
  };
}
