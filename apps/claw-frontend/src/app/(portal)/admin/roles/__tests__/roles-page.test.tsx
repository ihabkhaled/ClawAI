import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminRolesPage from '@/app/(portal)/admin/roles/page';
import type { RoleWithPermissions, UseRolesPageResult } from '@/types';

const mockHook = vi.fn();

vi.mock('@/hooks/roles/use-roles-page', () => ({
  useRolesPage: () => mockHook(),
}));

const sampleRole = {
  id: 'r1',
  slug: 'editor',
  name: 'Editor',
  description: null,
  isSystem: false,
  isAssignable: true,
  permissions: ['CHAT_READ'],
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
} satisfies RoleWithPermissions;

type HookShape = UseRolesPageResult & {
  t: (key: string) => string;
  user: { id: string; role: string } | null;
};

function baseHook(overrides: Partial<HookShape> = {}): HookShape {
  return {
    t: (key: string) => key,
    user: { id: 'u1', role: 'ADMIN' },
    roles: [],
    isLoading: false,
    isError: false,
    error: null,
    pendingId: null,
    mutationError: null,
    clearMutationError: vi.fn(),
    onDeleteRole: vi.fn(),
    onRetry: vi.fn(),
    dialogOpen: false,
    setDialogOpen: vi.fn(),
    isCreating: false,
    submitCreate: vi.fn(),
    openCreate: vi.fn(),
    ...overrides,
  } as HookShape;
}

describe('AdminRolesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders access-denied for a non-admin user', () => {
    mockHook.mockReturnValue(baseHook({ user: { id: 'u2', role: 'OPERATOR' } }));
    render(<AdminRolesPage />);
    expect(screen.queryByText('adminRoles.title')).not.toBeInTheDocument();
  });

  it('renders the loading state', () => {
    mockHook.mockReturnValue(baseHook({ isLoading: true }));
    render(<AdminRolesPage />);
    expect(screen.getByText('adminRoles.loading')).toBeInTheDocument();
  });

  it('renders the error state', () => {
    mockHook.mockReturnValue(baseHook({ isError: true, error: new Error('load failed') }));
    render(<AdminRolesPage />);
    expect(screen.getByText('load failed')).toBeInTheDocument();
  });

  it('renders the mutation error banner', () => {
    mockHook.mockReturnValue(baseHook({ mutationError: new Error('mutate failed') }));
    render(<AdminRolesPage />);
    expect(screen.getByText('mutate failed')).toBeInTheDocument();
  });

  it('renders the empty state when there are no roles', () => {
    mockHook.mockReturnValue(baseHook({ roles: [] }));
    render(<AdminRolesPage />);
    expect(screen.getByText('adminRoles.empty')).toBeInTheDocument();
  });

  it('renders role rows when roles are present', () => {
    mockHook.mockReturnValue(baseHook({ roles: [sampleRole] }));
    render(<AdminRolesPage />);
    expect(screen.getByText('Editor')).toBeInTheDocument();
  });
});
