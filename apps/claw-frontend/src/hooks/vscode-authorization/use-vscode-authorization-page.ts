'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  VSCODE_AUTHORIZATION_CLOSE_DELAY_MS,
  VSCODE_AUTHORIZATION_QUERY_KEY,
  VSCODE_AUTHORIZATION_REQUEST_PARAM,
} from '@/constants/vscode-authorization.constants';
import { useTranslation } from '@/lib/i18n';
import {
  approveVscodeAuthorization,
  deliverVscodeAuthorization,
  getVscodeAuthorizationDetails,
} from '@/repositories/auth/vscode-authorization.repository';
import type { UseVscodeAuthorizationPageReturn } from '@/types/vscode-authorization.types';
import { resolveApiErrorMessage } from '@/utilities/api-error-message.utility';

/**
 * Controller for the VS Code sign-in approval page. The error shown is
 * translated from the error CODE (a 429 says "try again in N minutes" from
 * Retry-After), never a raw backend sentence when a code is known.
 */
export function useVscodeAuthorizationPage(): UseVscodeAuthorizationPageReturn {
  const { t } = useTranslation();
  const requestId = useSearchParams().get(VSCODE_AUTHORIZATION_REQUEST_PARAM);
  const [completed, setCompleted] = useState(false);
  const details = useQuery({
    queryKey: [VSCODE_AUTHORIZATION_QUERY_KEY, requestId],
    queryFn: () => getVscodeAuthorizationDetails(requestId ?? ''),
    enabled: requestId !== null,
    retry: false,
  });
  const approval = useMutation({
    mutationFn: async () => {
      const result = await approveVscodeAuthorization(requestId ?? '');
      await deliverVscodeAuthorization(result.redirectUri);
    },
    onSuccess: () => setCompleted(true),
  });
  useEffect(() => {
    if (!completed) {
      return;
    }
    const closeTimer = window.setTimeout(() => window.close(), VSCODE_AUTHORIZATION_CLOSE_DELAY_MS);
    return () => window.clearTimeout(closeTimer);
  }, [completed]);

  const error = details.error ?? approval.error;
  const failure = error === null ? null : resolveApiErrorMessage(error, t, t('common.error'));
  const errorMessage = requestId === null ? t('common.error') : failure;

  return {
    details: details.data,
    isLoadingDetails: details.isLoading,
    isApproving: approval.isPending,
    completed,
    errorMessage,
    approve: () => approval.mutate(),
    t,
  };
}
