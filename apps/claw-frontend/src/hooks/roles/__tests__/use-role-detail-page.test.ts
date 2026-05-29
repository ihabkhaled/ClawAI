import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRoleDetailPage } from '@/hooks/roles/use-role-detail-page';
import type { PermissionCatalog, RoleWithPermissions } from '@/types';

const mockGet = vi.fn();
const mockListPermissions = vi.fn();
const mockUpdatePermissions = vi.fn();
const mockPush = vi.fn();
const mockShowToastSuccess = vi.fn();
const mockShowToastApiError = vi.fn();

vi.mock('@/repositories/admin/roles.repository', () => ({
  rolesRepository: {
    get: (...args: unknown[]) => mockGet(...args),
    listPermissions: (...args: unknown[]) => mockListPermissions(...args),
    updatePermissions: (...args: unknown[]) => mockUpdatePermissions(...args),
  },
}));

vi.mock('@/hooks/auth/use-current-user', () => ({
  useCurrentUser: () => ({ user: { id: 'u1', role: 'ADMIN' }, isLoading: false, isError: false }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ id: 'r1' }),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' }),
}));

vi.mock('@/utilities', async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return {
    ...mod,
    showToast: {
      success: (...args: unknown[]) => mockShowToastSuccess(...args),
      apiError: (...args: unknown[]) => mockShowToastApiError(...args),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    },
    logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
  };
});

function makeWrapper(): (props: { children: ReactNode }) => ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const sampleRole = {
  id: 'r1',
  slug: 'editor',
  name: 'Editor',
  permissions: ['CHAT_READ'],
} as unknown as RoleWithPermissions;

const sampleCatalog: PermissionCatalog = {
  permissions: ['CHAT_READ', 'CHAT_WRITE', 'ADMIN_PLANS'],
};

describe('useRoleDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the role + catalog and groups permissions', async () => {
    mockGet.mockResolvedValue(sampleRole);
    mockListPermissions.mockResolvedValue(sampleCatalog);
    const { result } = renderHook(() => useRoleDetailPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.role).not.toBeNull();
    });
    expect(result.current.groups.length).toBeGreaterThan(0);
    expect(result.current.selected.has('CHAT_READ')).toBe(true);
    expect(result.current.isDirty).toBe(false);
  });

  it('togglePermission flips selection and marks dirty', async () => {
    mockGet.mockResolvedValue(sampleRole);
    mockListPermissions.mockResolvedValue(sampleCatalog);
    const { result } = renderHook(() => useRoleDetailPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.role).not.toBeNull();
    });
    act(() => {
      result.current.togglePermission('CHAT_WRITE');
    });
    expect(result.current.selected.has('CHAT_WRITE')).toBe(true);
    expect(result.current.isDirty).toBe(true);
  });

  it('selectGroup adds all permissions of a group', async () => {
    mockGet.mockResolvedValue(sampleRole);
    mockListPermissions.mockResolvedValue(sampleCatalog);
    const { result } = renderHook(() => useRoleDetailPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.groups.length).toBeGreaterThan(0);
    });
    act(() => {
      result.current.selectGroup('CHAT', true);
    });
    expect(result.current.selected.has('CHAT_READ')).toBe(true);
    expect(result.current.selected.has('CHAT_WRITE')).toBe(true);
  });

  it('onReset restores the baseline selection', async () => {
    mockGet.mockResolvedValue(sampleRole);
    mockListPermissions.mockResolvedValue(sampleCatalog);
    const { result } = renderHook(() => useRoleDetailPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.role).not.toBeNull();
    });
    act(() => {
      result.current.togglePermission('ADMIN_PLANS');
    });
    expect(result.current.isDirty).toBe(true);
    act(() => {
      result.current.onReset();
    });
    expect(result.current.isDirty).toBe(false);
    expect(result.current.selected.has('ADMIN_PLANS')).toBe(false);
  });

  it('onSave posts the selected permissions and fires success toast', async () => {
    mockGet.mockResolvedValue(sampleRole);
    mockListPermissions.mockResolvedValue(sampleCatalog);
    mockUpdatePermissions.mockResolvedValue(sampleRole);
    const { result } = renderHook(() => useRoleDetailPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.role).not.toBeNull();
    });
    act(() => {
      result.current.onSave();
    });
    await waitFor(() => {
      expect(mockUpdatePermissions).toHaveBeenCalledWith('r1', {
        permissions: expect.arrayContaining(['CHAT_READ']),
      });
    });
    expect(mockShowToastSuccess).toHaveBeenCalled();
  });

  it('surfaces save errors via saveError + apiError toast', async () => {
    mockGet.mockResolvedValue(sampleRole);
    mockListPermissions.mockResolvedValue(sampleCatalog);
    mockUpdatePermissions.mockRejectedValue(new Error('save-failed'));
    const { result } = renderHook(() => useRoleDetailPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.role).not.toBeNull();
    });
    act(() => {
      result.current.onSave();
    });
    await waitFor(() => {
      expect(result.current.saveError?.message).toBe('save-failed');
    });
    expect(mockShowToastApiError).toHaveBeenCalled();
  });

  it('selectGroup(false) deselects every permission in the group', async () => {
    mockGet.mockResolvedValue(sampleRole);
    mockListPermissions.mockResolvedValue(sampleCatalog);
    const { result } = renderHook(() => useRoleDetailPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.groups.length).toBeGreaterThan(0);
    });
    act(() => {
      result.current.selectGroup('CHAT', true);
    });
    expect(result.current.selected.has('CHAT_WRITE')).toBe(true);
    act(() => {
      result.current.selectGroup('CHAT', false);
    });
    expect(result.current.selected.has('CHAT_READ')).toBe(false);
    expect(result.current.selected.has('CHAT_WRITE')).toBe(false);
  });

  it('selectGroup ignores an unknown group key', async () => {
    mockGet.mockResolvedValue(sampleRole);
    mockListPermissions.mockResolvedValue(sampleCatalog);
    const { result } = renderHook(() => useRoleDetailPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.groups.length).toBeGreaterThan(0);
    });
    const before = new Set(result.current.selected);
    act(() => {
      result.current.selectGroup('NON_EXISTENT', true);
    });
    expect(result.current.selected).toEqual(before);
  });

  it('onRetry refetches both queries', async () => {
    mockGet.mockResolvedValue(sampleRole);
    mockListPermissions.mockResolvedValue(sampleCatalog);
    const { result } = renderHook(() => useRoleDetailPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.role).not.toBeNull();
    });
    mockGet.mockClear();
    mockListPermissions.mockClear();
    act(() => {
      result.current.onRetry();
    });
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalled();
    });
    expect(mockListPermissions).toHaveBeenCalled();
  });

  it('onCancel navigates back to the roles list', async () => {
    mockGet.mockResolvedValue(sampleRole);
    mockListPermissions.mockResolvedValue(sampleCatalog);
    const { result } = renderHook(() => useRoleDetailPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.role).not.toBeNull();
    });
    act(() => {
      result.current.onCancel();
    });
    expect(mockPush).toHaveBeenCalledWith('/admin/roles');
  });
});
