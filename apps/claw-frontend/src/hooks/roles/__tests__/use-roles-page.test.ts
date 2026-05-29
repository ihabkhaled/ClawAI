import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRolesPage } from '@/hooks/roles/use-roles-page';
import type { CreateRoleRequest, RoleWithPermissions } from '@/types';

const mockList = vi.fn();
const mockRemove = vi.fn();
const mockCreate = vi.fn();
const mockShowToastSuccess = vi.fn();
const mockShowToastApiError = vi.fn();

vi.mock('@/repositories/admin/roles.repository', () => ({
  rolesRepository: {
    list: (...args: unknown[]) => mockList(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

vi.mock('@/hooks/auth/use-current-user', () => ({
  useCurrentUser: () => ({ user: { id: 'u1', role: 'ADMIN' }, isLoading: false, isError: false }),
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

const sampleRole = { id: 'r1', slug: 'editor', name: 'Editor' } as unknown as RoleWithPermissions;

describe('useRolesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('surfaces roles from the query', async () => {
    mockList.mockResolvedValue([sampleRole]);
    const { result } = renderHook(() => useRolesPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.roles).toHaveLength(1);
    });
  });

  it('surfaces query errors', async () => {
    mockList.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useRolesPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toBe('boom');
  });

  it('onDeleteRole calls the repo, fires success toast and clears pendingId', async () => {
    mockList.mockResolvedValue([sampleRole]);
    mockRemove.mockResolvedValue(undefined);
    const { result } = renderHook(() => useRolesPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.roles).toHaveLength(1);
    });
    act(() => {
      result.current.onDeleteRole('r1');
    });
    await waitFor(() => {
      expect(mockShowToastSuccess).toHaveBeenCalled();
    });
    expect(mockRemove).toHaveBeenCalledWith('r1');
    expect(result.current.pendingId).toBeNull();
  });

  it('openCreate opens the dialog and submitCreate posts the payload + closes it', async () => {
    mockList.mockResolvedValue([sampleRole]);
    mockCreate.mockResolvedValue(sampleRole);
    const { result } = renderHook(() => useRolesPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.roles).toHaveLength(1);
    });

    act(() => {
      result.current.openCreate();
    });
    expect(result.current.dialogOpen).toBe(true);

    const payload: CreateRoleRequest = { slug: 'viewer', name: 'Viewer' };
    act(() => {
      result.current.submitCreate(payload);
    });
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(payload);
    });
    await waitFor(() => {
      expect(result.current.dialogOpen).toBe(false);
    });
  });

  it('surfaces create mutation errors via mutationError + apiError toast', async () => {
    mockList.mockResolvedValue([sampleRole]);
    mockCreate.mockRejectedValue(new Error('conflict'));
    const { result } = renderHook(() => useRolesPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.roles).toHaveLength(1);
    });
    act(() => {
      result.current.submitCreate({ slug: 'dupe', name: 'Dupe' });
    });
    await waitFor(() => {
      expect(result.current.mutationError?.message).toBe('conflict');
    });
    expect(mockShowToastApiError).toHaveBeenCalled();
  });

  it('clearMutationError resets the error state', async () => {
    mockList.mockResolvedValue([sampleRole]);
    mockRemove.mockRejectedValue(new Error('nope'));
    const { result } = renderHook(() => useRolesPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.roles).toHaveLength(1);
    });
    act(() => {
      result.current.onDeleteRole('r1');
    });
    await waitFor(() => {
      expect(result.current.mutationError).not.toBeNull();
    });
    act(() => {
      result.current.clearMutationError();
    });
    expect(result.current.mutationError).toBeNull();
  });

  it('setDialogOpen toggles dialog state and onRetry refetches', async () => {
    mockList.mockResolvedValue([sampleRole]);
    const { result } = renderHook(() => useRolesPage(), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.roles).toHaveLength(1);
    });
    act(() => {
      result.current.setDialogOpen(true);
    });
    expect(result.current.dialogOpen).toBe(true);
    mockList.mockClear();
    act(() => {
      result.current.onRetry();
    });
    await waitFor(() => {
      expect(mockList).toHaveBeenCalled();
    });
  });
});
