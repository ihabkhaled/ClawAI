'use client';

import { useQuery } from '@tanstack/react-query';

import { useEmailChangeCooldown } from '@/hooks/settings/use-email-change-cooldown';
import { useEmailChangeForms } from '@/hooks/settings/use-email-change-forms';
import { useEmailChangeMutations } from '@/hooks/settings/use-email-change-mutations';
import { useTranslation } from '@/lib/i18n';
import { queryKeys } from '@/repositories/shared/query-keys';
import { emailChangeService } from '@/services/auth/email-change.service';
import type { UseEmailChangeReturn } from '@/types';

export const useEmailChange = (): UseEmailChangeReturn => {
  const { t } = useTranslation();
  const { request, verifyCurrent, resend, cancel } = useEmailChangeMutations();
  const pendingQuery = useQuery({
    queryKey: queryKeys.auth.emailChange,
    queryFn: () => emailChangeService.getPending(),
  });
  const pendingState = pendingQuery.data ?? null;
  const requestId = pendingState?.requestId ?? null;
  const { requestForm, otpForm } = useEmailChangeForms();
  const { resendCooldownSeconds, startResendCooldown } = useEmailChangeCooldown(
    pendingState?.stage ?? null,
  );
  const submitRequest = requestForm.handleSubmit((data) =>
    request.mutate(data, { onSuccess: startResendCooldown }),
  );
  const submitOtp = otpForm.handleSubmit((data) => {
    if (!requestId) {
      return;
    }
    verifyCurrent.mutate({ requestId, otp: data.otp });
  });
  const resendOtp = (): void => {
    if (requestId) {
      resend.mutate({ requestId }, { onSuccess: startResendCooldown });
    }
  };
  const cancelChange = (): void => {
    if (requestId) {
      cancel.mutate({ requestId });
    }
  };
  return {
    pendingState,
    loading: pendingQuery.isLoading,
    requestForm,
    otpForm,
    submitRequest,
    submitOtp,
    resendOtp,
    cancelChange,
    t,
    resendCooldownSeconds,
    isRequesting: request.isPending,
    isVerifying: verifyCurrent.isPending,
    isResending: resend.isPending,
    isCancelling: cancel.isPending,
  };
};
