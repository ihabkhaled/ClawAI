'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import {
  requestEmailChangeSchema,
  confirmOtpSchema,
  type RequestEmailChangeFormValues,
  type ConfirmOtpFormValues,
} from '@/lib/validation/email-change.schema';

export function useEmailChangeForms() {
  const requestForm = useForm<RequestEmailChangeFormValues>({
    resolver: zodResolver(requestEmailChangeSchema),
    defaultValues: {
      currentPassword: '',
      newEmail: '',
    },
  });

  const otpForm = useForm<ConfirmOtpFormValues>({
    resolver: zodResolver(confirmOtpSchema),
    defaultValues: {
      otp: '',
    },
  });

  return { requestForm, otpForm };
}
