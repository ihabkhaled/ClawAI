'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import {
  adminPlanGrantSchema,
  type AdminPlanGrantFormValues,
} from '@/lib/validation/admin-plan-grant.schema';
import type { AdminUser, UseAssignPlanFormReturn } from '@/types';

const EMPTY_VALUES: AdminPlanGrantFormValues = { planId: '', durationMonths: 1, grantReason: '' };

export function useAssignPlanForm(
  user: AdminUser | null,
  targetPlanId: string | null,
  onSave: (userId: string, planId: string, durationMonths: number, grantReason: string) => void,
): UseAssignPlanFormReturn {
  const form = useForm<AdminPlanGrantFormValues>({
    resolver: zodResolver(adminPlanGrantSchema),
    mode: 'onChange',
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    form.reset(
      user && targetPlanId
        ? { planId: targetPlanId, durationMonths: 1, grantReason: '' }
        : EMPTY_VALUES,
    );
  }, [form, user, targetPlanId]);

  return {
    form,
    submit: form.handleSubmit((values) => {
      if (!user) {
        return;
      }
      onSave(user.id, values.planId, values.durationMonths, values.grantReason.trim());
    }),
  };
}
