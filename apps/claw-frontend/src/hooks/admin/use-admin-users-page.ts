import { useQuery } from '@tanstack/react-query';

import { UserRole, UserStatus } from '@/enums';
import type { EmailVerificationFilter } from '@/enums/email-verification-filter.enum';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useTranslation } from '@/lib/i18n';
import { plansRepository } from '@/repositories/admin/plans.repository';
import { auditRepository } from '@/repositories/audit/audit.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseAdminUsersPageReturn } from '@/types';

import { useAdminUserFilters } from './use-admin-user-filters';
import { useAdminUserMutations } from './use-admin-user-mutations';
import { useCreateUserDialog } from './use-create-user-dialog';

export function useAdminUsersPage(): UseAdminUsersPageReturn {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const filters = useAdminUserFilters();
  const createDialog = useCreateUserDialog();
  // The dialog closes on success rather than on submit, so a refusal keeps the
  // typed values on screen instead of discarding them.
  const mutations = useAdminUserMutations(createDialog.close);

  const userQuery = {
    page: filters.page,
    limit: 20,
    search: filters.search || undefined,
    role: filters.roleFilter || undefined,
    status: filters.statusFilter || undefined,
    planId: filters.planFilter || undefined,
    verification: filters.verificationFilter as EmailVerificationFilter | undefined,
  };

  const usersQuery = useQuery({
    queryKey: [...queryKeys.admin.users, userQuery],
    queryFn: () => auditRepository.getAdminUsers(userQuery),
    enabled: user?.role === UserRole.ADMIN,
  });

  const plansQuery = useQuery({
    queryKey: queryKeys.adminPlans.lists(),
    queryFn: () => plansRepository.list(),
    enabled: user?.role === UserRole.ADMIN,
  });

  const users = usersQuery.data?.data ?? [];
  const activeCount = users.filter((u) => u.status === UserStatus.ACTIVE).length;

  // The table needs identity, not the whole profile: the capability rule asks
  // only "is this row me" and "am I the super administrator".
  const actor = user ? { id: user.id, isSuperAdmin: user.isSuperAdmin === true } : null;

  return {
    t,
    createDialog,
    user: user ?? null,
    actor,
    ...filters,
    ...mutations,
    users,
    usersMeta: usersQuery.data?.meta,
    plans: plansQuery.data ?? [],
    activeCount,
    usersQuery: { isLoading: usersQuery.isLoading, isError: usersQuery.isError },
    onRetry: () => {
      void usersQuery.refetch();
    },
  };
}
