import { useCallback, useState } from 'react';

import { UserRole } from '@/enums';
import { useUserSessionActions } from '@/hooks/admin/use-user-session-actions';
import { useUserSessionsQuery } from '@/hooks/admin/use-user-sessions-query';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useTranslation } from '@/lib/i18n';
import type { SessionActionTarget, UseUserSessionsPageReturn } from '@/types/admin-sessions.types';

/** Controller of /admin/users/[id]/sessions: the list, its filters and the confirm dialog. */
export function useUserSessionsPage(userId: string): UseUserSessionsPageReturn {
  const { t, locale } = useTranslation();
  const { user } = useCurrentUser();
  const isAdmin = user?.role === UserRole.ADMIN;
  const isOwnAccount = user?.id === userId;
  const sessions = useUserSessionsQuery(userId, isAdmin);
  const actions = useUserSessionActions(userId, isOwnAccount);
  const [target, setTarget] = useState<SessionActionTarget | null>(null);

  const closeTarget = useCallback((): void => setTarget(null), []);
  const confirmTarget = useCallback(async (): Promise<void> => {
    if (target !== null && (await actions.perform(target))) {
      setTarget(null);
    }
  }, [actions, target]);

  return {
    t,
    locale,
    userId,
    username: sessions.response.user.username === '' ? null : sessions.response.user.username,
    isAdmin,
    isOwnAccount,
    isLoading: sessions.isLoading,
    isError: sessions.isError,
    sessions: sessions.response.data,
    summary: sessions.response.summary,
    meta: sessions.response.meta,
    stateFilter: sessions.stateFilter,
    setStateFilter: sessions.setStateFilter,
    page: sessions.page,
    pageSize: sessions.pageSize,
    setPage: sessions.setPage,
    setPageSize: sessions.setPageSize,
    retry: sessions.retry,
    target,
    openTarget: setTarget,
    closeTarget,
    isActing: actions.isActing,
    confirmTarget,
  };
}
