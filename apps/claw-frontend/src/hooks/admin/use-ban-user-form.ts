'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { BAN_DEFAULT_AMOUNT } from '@/constants/admin-user-management.constants';
import { BanDurationUnit } from '@/enums/ban-duration-unit.enum';
import { adminUserBanSchema } from '@/lib/validation/admin-user-ban.schema';
import type { AdminUser, BanFormValues, BanUserRequest, UseBanUserFormReturn } from '@/types';

const EMPTY_VALUES: BanFormValues = {
  unit: BanDurationUnit.DAYS,
  amount: BAN_DEFAULT_AMOUNT,
  reason: '',
};

export function useBanUserForm(
  user: AdminUser | null,
  onConfirm: (userId: string, data: BanUserRequest) => Promise<boolean>,
  onDone: () => void,
): UseBanUserFormReturn {
  const form = useForm<BanFormValues>({
    resolver: zodResolver(adminUserBanSchema),
    mode: 'onChange',
    defaultValues: EMPTY_VALUES,
  });

  // The dialog stays mounted between rows: every new target starts from a clean form.
  useEffect(() => {
    form.reset(EMPTY_VALUES);
  }, [form, user]);

  const unit = form.watch('unit');
  const isTimed = unit !== BanDurationUnit.LIFETIME;

  return {
    form,
    isTimed,
    submit: form.handleSubmit(async (values) => {
      if (!user) {
        return;
      }
      const body: BanUserRequest = {
        unit: values.unit,
        reason: values.reason,
        ...(values.unit === BanDurationUnit.LIFETIME ? {} : { amount: values.amount }),
      };
      if (await onConfirm(user.id, body)) {
        onDone();
      }
    }),
  };
}
