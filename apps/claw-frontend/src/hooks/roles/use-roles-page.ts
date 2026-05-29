import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { UserRole } from '@/enums';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useTranslation } from '@/lib/i18n';
import { rolesRepository } from '@/repositories/admin/roles.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  CreateRoleRequest,
  TranslateFunction,
  UseRolesPageResult,
  UserProfile,
} from '@/types';
import { logger, showToast } from '@/utilities';

export function useRolesPage(): UseRolesPageResult & {
  t: TranslateFunction;
  user: UserProfile | null;
} {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<Error | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  const isAdmin = user?.role === UserRole.ADMIN;

  const query = useQuery({
    queryKey: queryKeys.adminRoles.lists(),
    queryFn: () => rolesRepository.list(),
    enabled: isAdmin,
    staleTime: 30_000,
  });

  const invalidate = useCallback((): void => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.adminRoles.lists() });
  }, [queryClient]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rolesRepository.remove(id),
    onMutate: (id: string) => {
      setPendingId(id);
      setMutationError(null);
    },
    onSuccess: () => {
      showToast.success({ description: t('adminRoles.deleteSucceeded') });
      invalidate();
    },
    onError: (err: Error) => {
      setMutationError(err);
      showToast.apiError(err, t('adminRoles.deleteFailed'));
    },
    onSettled: () => setPendingId(null),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateRoleRequest) => rolesRepository.create(payload),
    onMutate: () => setMutationError(null),
    onSuccess: () => {
      showToast.success({ description: t('adminRoles.createSucceeded') });
      invalidate();
      setDialogOpen(false);
    },
    onError: (err: Error) => {
      setMutationError(err);
      showToast.apiError(err, t('adminRoles.createFailed'));
    },
  });

  const onDeleteRole = useCallback(
    (id: string): void => {
      logger.info({
        component: 'admin-roles',
        action: 'delete',
        message: 'Deleting role',
        details: { id },
      });
      deleteMutation.mutate(id);
    },
    [deleteMutation],
  );

  const submitCreate = useCallback(
    (payload: CreateRoleRequest): void => {
      logger.info({ component: 'admin-roles', action: 'create', message: 'Creating role' });
      createMutation.mutate(payload);
    },
    [createMutation],
  );

  const openCreate = useCallback((): void => {
    setMutationError(null);
    setDialogOpen(true);
  }, []);

  const clearMutationError = useCallback((): void => setMutationError(null), []);
  const onRetry = useCallback((): void => {
    void query.refetch();
  }, [query]);

  return {
    t,
    user: user ?? null,
    roles: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
    pendingId,
    mutationError,
    clearMutationError,
    onDeleteRole,
    onRetry,
    dialogOpen,
    setDialogOpen,
    isCreating: createMutation.isPending,
    submitCreate,
    openCreate,
  };
}
