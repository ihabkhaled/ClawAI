import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ROUTES } from '@/constants/routes.constants';
import { UserRole } from '@/enums';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useTranslation } from '@/lib/i18n';
import { rolesRepository } from '@/repositories/admin/roles.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  TranslateFunction,
  UpdateRolePermissionsRequest,
  UseRoleDetailPageResult,
  UserProfile,
} from '@/types';
import { groupPermissions, logger, showToast } from '@/utilities';

export function useRoleDetailPage(): UseRoleDetailPageResult & {
  t: TranslateFunction;
  user: UserProfile | null;
} {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams<{ id: string }>();
  const roleId = params.id ?? '';
  const isAdmin = user?.role === UserRole.ADMIN;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [baseline, setBaseline] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<Error | null>(null);

  const roleQuery = useQuery({
    queryKey: queryKeys.adminRoles.detail(roleId),
    queryFn: () => rolesRepository.get(roleId),
    enabled: isAdmin && roleId.length > 0,
    staleTime: 30_000,
  });

  const catalogQuery = useQuery({
    queryKey: queryKeys.adminRoles.permissions(),
    queryFn: () => rolesRepository.listPermissions(),
    enabled: isAdmin,
    staleTime: 300_000,
  });

  useEffect(() => {
    if (roleQuery.data) {
      const next = new Set(roleQuery.data.permissions);
      setSelected(next);
      setBaseline(new Set(roleQuery.data.permissions));
    }
  }, [roleQuery.data]);

  const catalog = catalogQuery.data?.permissions;
  const groups = useMemo(() => (catalog === undefined ? [] : groupPermissions(catalog)), [catalog]);

  const isDirty = useMemo(() => {
    if (selected.size !== baseline.size) {
      return true;
    }
    for (const permission of selected) {
      if (!baseline.has(permission)) {
        return true;
      }
    }
    return false;
  }, [selected, baseline]);

  const togglePermission = useCallback((permission: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(permission)) {
        next.delete(permission);
      } else {
        next.add(permission);
      }
      return next;
    });
  }, []);

  const selectGroup = useCallback(
    (groupKey: string, next: boolean): void => {
      const group = groups.find((g) => g.groupKey === groupKey);
      if (group === undefined) {
        return;
      }
      setSelected((prev) => {
        const updated = new Set(prev);
        for (const permission of group.permissions) {
          if (next) {
            updated.add(permission);
          } else {
            updated.delete(permission);
          }
        }
        return updated;
      });
    },
    [groups],
  );

  const goBack = useCallback((): void => {
    router.push(ROUTES.ADMIN_ROLES);
  }, [router]);

  const saveMutation = useMutation({
    mutationFn: (payload: UpdateRolePermissionsRequest) =>
      rolesRepository.updatePermissions(roleId, payload),
    onMutate: () => setSaveError(null),
    onSuccess: () => {
      showToast.success({ description: t('adminRoles.detail.saveSucceeded') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminRoles.detail(roleId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminRoles.lists() });
    },
    onError: (err: Error) => {
      setSaveError(err);
      showToast.apiError(err, t('adminRoles.detail.saveFailed'));
    },
  });

  const onSave = useCallback((): void => {
    logger.info({
      component: 'admin-roles',
      action: 'save-permissions',
      message: 'Saving role permissions',
      details: { roleId, count: selected.size },
    });
    saveMutation.mutate({ permissions: [...selected] });
  }, [selected, saveMutation, roleId]);

  const onReset = useCallback((): void => {
    setSelected(new Set(baseline));
  }, [baseline]);

  const onCancel = useCallback((): void => goBack(), [goBack]);
  const onRetry = useCallback((): void => {
    void roleQuery.refetch();
    void catalogQuery.refetch();
  }, [roleQuery, catalogQuery]);

  return {
    t,
    user: user ?? null,
    role: roleQuery.data ?? null,
    groups,
    selected,
    isLoading: roleQuery.isLoading || catalogQuery.isLoading,
    isError: roleQuery.isError || catalogQuery.isError,
    error: (roleQuery.error as Error | null) ?? (catalogQuery.error as Error | null) ?? null,
    isDirty,
    isSaving: saveMutation.isPending,
    saveError,
    togglePermission,
    selectGroup,
    onSave,
    onReset,
    onCancel,
    onRetry,
  };
}
