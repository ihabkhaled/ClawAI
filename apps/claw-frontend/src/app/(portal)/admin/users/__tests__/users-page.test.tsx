import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { UserRole } from '@/enums';
import { useAdminUsersPage } from '@/hooks/admin/use-admin-users-page';
import type { UseAdminUsersPageReturn } from '@/types';

import UsersPage from '../page';

vi.mock('@/hooks/admin/use-admin-users-page');
vi.mock('@/components/admin/access-denied', () => ({
  AccessDenied: function AccessDenied() {
    return <div data-testid="access-denied" />;
  },
}));
vi.mock('@/components/admin/user-filters', () => ({
  UserFilters: function UserFilters() {
    return <div data-testid="user-filters" />;
  },
}));
vi.mock('@/components/admin/users-content', () => ({
  UsersContent: function UsersContent() {
    return <div data-testid="users-content" />;
  },
}));

const mockUseAdminUsersPage = vi.mocked(useAdminUsersPage);
const onRetry = vi.fn();
const noop = vi.fn();
const baseReturn = {
  t: (key: string) => key,
  user: { role: UserRole.ADMIN },
  actor: { id: 'admin-1', isSuperAdmin: false },
  createDialog: { isOpen: false, open: noop, close: noop },
  handleCreateUser: noop,
  isCreateUserPending: false,
  handleActivate: noop,
  isActivatePending: false,
  plans: [],
  search: '',
  roleFilter: '',
  statusFilter: '',
  planFilter: '',
  verificationFilter: '',
  setSearch: noop,
  setRoleFilter: noop,
  setStatusFilter: noop,
  setPlanFilter: noop,
  setVerificationFilter: noop,
  page: 1,
  setPage: noop,
  users: [],
  usersMeta: { total: 0, page: 1, limit: 20, totalPages: 1 },
  usersQuery: { isLoading: false, isError: false },
  onRetry,
  actionPending: null,
  handleChangeRole: noop,
  handleDeactivate: noop,
  handleReactivate: noop,
  handleAssignPlan: noop,
  handleUpdateUser: noop,
  handleTemporaryPassword: noop,
  isRoleChangePending: false,
  isDeactivatePending: false,
  isReactivatePending: false,
  isAssignPlanPending: false,
  isUpdateUserPending: false,
  isTemporaryPasswordPending: false,
  activeCount: 0,
} satisfies UseAdminUsersPageReturn;

describe('AdminUsersPage', () => {
  afterEach(() => vi.clearAllMocks());

  it('shows access denied for a non-admin', () => {
    mockUseAdminUsersPage.mockReturnValue({ ...baseReturn, user: { role: UserRole.USER } });
    render(<UsersPage />);
    expect(screen.getByTestId('access-denied')).toBeInTheDocument();
  });

  it('shows the loading state', () => {
    mockUseAdminUsersPage.mockReturnValue({
      ...baseReturn,
      usersQuery: { isLoading: true, isError: false },
    });
    render(<UsersPage />);
    expect(screen.getByText('admin.loadingUsers')).toBeInTheDocument();
  });

  it('shows the error state and retries', () => {
    mockUseAdminUsersPage.mockReturnValue({
      ...baseReturn,
      usersQuery: { isLoading: false, isError: true },
    });
    render(<UsersPage />);
    expect(screen.getByText('admin.loadUsersFailedDesc')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('shows the empty state', () => {
    mockUseAdminUsersPage.mockReturnValue(baseReturn);
    render(<UsersPage />);
    expect(screen.getByText('admin.noUsers')).toBeInTheDocument();
  });

  it('renders user content for data', () => {
    mockUseAdminUsersPage.mockReturnValue({
      ...baseReturn,
      users: [
        {
          id: 'u1',
          email: 'a@b.com',
          username: 'alice',
          role: 'ADMIN',
          status: 'ACTIVE',
          createdAt: '2026-05-01T00:00:00.000Z',
          activePlanId: null,
          isSuperAdmin: false,
          emailVerifiedAt: null,
          firstName: null,
          lastName: null,
        },
      ],
      usersMeta: { ...baseReturn.usersMeta, total: 1 },
    });
    render(<UsersPage />);
    expect(screen.getByTestId('users-content')).toBeInTheDocument();
  });
});
