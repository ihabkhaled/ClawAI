import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDeploymentPage } from '@/hooks/admin/use-deployment-page';

const mockGet = vi.fn();
let mockUser: { id: string; role: string; isSuperAdmin?: boolean } | null;

vi.mock('@/hooks/auth/use-current-user', () => ({
  useCurrentUser: () => ({ user: mockUser, isLoading: false }),
}));

vi.mock('@/repositories/admin/deployment.repository', () => ({
  deploymentRepository: { get: () => mockGet() },
}));

vi.mock('@/hooks/admin/use-deployment-actions', () => ({
  useDeploymentActions: () => ({ isBusy: false }),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en' }),
}));

function wrapper({ children }: { children: ReactNode }): ReactElement {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useDeploymentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: 'super-admin', role: 'ADMIN', isSuperAdmin: true };
  });

  it('loads deployment status only for the seeded super administrator', async () => {
    mockGet.mockResolvedValue({ state: 'completed', targetSha: 'a'.repeat(40) });
    const { result } = renderHook(() => useDeploymentPage(), { wrapper });

    await waitFor(() => expect(result.current.status?.state).toBe('completed'));
    expect(mockGet).toHaveBeenCalledOnce();
  });

  it('exposes the manual controls alongside the status', async () => {
    mockGet.mockResolvedValue({ state: 'completed', targetSha: 'a'.repeat(40) });
    const { result } = renderHook(() => useDeploymentPage(), { wrapper });

    await waitFor(() => expect(result.current.status).not.toBeNull());
    expect(result.current.actions.isBusy).toBe(false);
  });

  it('does not call the endpoint for another administrator', async () => {
    mockUser = { id: 'admin-2', role: 'ADMIN', isSuperAdmin: false };
    renderHook(() => useDeploymentPage(), { wrapper });

    await waitFor(() => expect(mockGet).not.toHaveBeenCalled());
  });
});
