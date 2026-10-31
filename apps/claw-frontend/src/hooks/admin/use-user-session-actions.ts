import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useTranslation } from '@/lib/i18n';
import { userSessionsRepository } from '@/repositories/admin/user-sessions.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { SessionActionTarget } from '@/types/admin-sessions.types';
import { logger, showToast } from '@/utilities';

/**
 * Ends or clears logins for one user (ADR-204). Ending your OWN current login, or all of your
 * own logins, sends the explicit confirm flag the server demands; the dialog that calls this
 * has already shown the "this is your current session" warning.
 */
export function useUserSessionActions(userId: string, isOwnAccount: boolean) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const run = useMutation({
    mutationFn: (target: SessionActionTarget): Promise<unknown> => {
      switch (target.kind) {
        case 'terminate-one':
          return userSessionsRepository.terminateOne(
            userId,
            target.session.familyId,
            target.session.isCurrent,
          );
        case 'terminate-all':
          return userSessionsRepository.terminateAll(userId, isOwnAccount);
        case 'clear-one':
          return userSessionsRepository.clearOne(userId, target.session.familyId);
        case 'clear-all':
          return userSessionsRepository.clearInactive(userId);
      }
    },
    onSuccess: (_result, target) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminSessions.user(userId) });
      showToast.success({
        description: t(
          target.kind === 'terminate-one' || target.kind === 'terminate-all'
            ? 'adminSessions.terminated'
            : 'adminSessions.cleared',
        ),
      });
    },
    onError: (error: unknown) => {
      showToast.apiError(error, t('adminSessions.actionFailed'), { translate: t });
    },
  });

  const perform = useCallback(
    async (target: SessionActionTarget): Promise<boolean> => {
      logger.info({
        component: 'admin',
        action: `sessions-${target.kind}`,
        message: 'Session action',
        details: { userId },
      });
      try {
        await run.mutateAsync(target);
        return true;
      } catch {
        return false;
      }
    },
    [run, userId],
  );

  return { perform, isActing: run.isPending };
}
