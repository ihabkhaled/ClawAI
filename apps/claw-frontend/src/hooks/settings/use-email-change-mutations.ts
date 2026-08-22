'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { queryKeys } from '@/repositories/shared/query-keys';
import { emailChangeService } from '@/services/auth/email-change.service';
import type {
  CancelEmailChangeRequest,
  ConfirmOldEmailOtpRequest,
  RequestEmailChangeRequest,
  ResendEmailChangeOtpRequest,
} from '@/types';
import { showToast } from '@/utilities';

export const useEmailChangeMutations = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const onSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.auth.emailChange });
  };

  const onError = (error: unknown) => {
    showToast.apiError(error, t('settings.emailChange.requestFailed'));
  };

  const request = useMutation({
    mutationFn: (data: RequestEmailChangeRequest) => emailChangeService.request(data),
    onSuccess,
    onError,
  });

  const verifyCurrent = useMutation({
    mutationFn: (data: ConfirmOldEmailOtpRequest) => emailChangeService.verifyCurrent(data),
    onSuccess,
    onError,
  });

  const resend = useMutation({
    mutationFn: (data: ResendEmailChangeOtpRequest) => emailChangeService.resend(data),
    onSuccess,
    onError,
  });

  const cancel = useMutation({
    mutationFn: (data: CancelEmailChangeRequest) => emailChangeService.cancel(data),
    onSuccess,
    onError,
  });

  return { request, verifyCurrent, resend, cancel };
};
