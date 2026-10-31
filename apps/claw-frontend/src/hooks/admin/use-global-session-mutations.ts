import { useMutation } from '@tanstack/react-query';

import type { SessionGlobalAction } from '@/enums/session-global-action.enum';
import { SessionGlobalAction as Action } from '@/enums/session-global-action.enum';
import { useTranslation } from '@/lib/i18n';
import { userSessionsRepository } from '@/repositories/admin/user-sessions.repository';
import type {
  SessionClearResult,
  SessionGlobalChallengeResponse,
  SessionTerminateResult,
} from '@/types/admin-sessions.types';
import { logger, showToast } from '@/utilities';

/**
 * The three calls of the system-wide actions (ADR-204). Failures are toasted with the coded,
 * translated message; the password and the token are passed through and never logged.
 */
export function useGlobalSessionMutations() {
  const { t } = useTranslation();
  const onError = (error: unknown): void => {
    showToast.apiError(error, t('adminSessions.actionFailed'), { translate: t });
  };

  const challenge = useMutation({
    mutationFn: (input: { action: SessionGlobalAction; password: string }) =>
      userSessionsRepository.globalChallenge(input.action, input.password),
    onError,
  });
  const confirm = useMutation({
    mutationFn: (input: {
      action: SessionGlobalAction;
      token: string;
      phrase: string;
    }): Promise<SessionTerminateResult | SessionClearResult> => {
      logger.warn({
        component: 'admin',
        action: 'sessions-global-confirm',
        message: 'System-wide session action confirmed',
        details: { action: input.action },
      });
      return input.action === Action.TERMINATE_ALL
        ? userSessionsRepository.globalTerminateAll(input.token, input.phrase)
        : userSessionsRepository.globalClearLogs(input.token, input.phrase);
    },
    onError,
  });

  return {
    requestToken: (
      action: SessionGlobalAction,
      password: string,
    ): Promise<SessionGlobalChallengeResponse> => challenge.mutateAsync({ action, password }),
    runAction: (action: SessionGlobalAction, token: string, phrase: string) =>
      confirm.mutateAsync({ action, token, phrase }),
    isBusy: challenge.isPending || confirm.isPending,
  };
}
