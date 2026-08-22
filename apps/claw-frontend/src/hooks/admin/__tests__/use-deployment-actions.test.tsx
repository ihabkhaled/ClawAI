import { DeploymentTriggerMode } from '@claw/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDeploymentActions } from '@/hooks/admin/use-deployment-actions';

const mockTrigger = vi.fn();
const mockReset = vi.fn();
const mockSetAutomation = vi.fn();
const mockSuccess = vi.fn();
const mockApiError = vi.fn();

vi.mock('@/repositories/admin/deployment.repository', () => ({
  deploymentRepository: {
    trigger: (...args: unknown[]) => mockTrigger(...args),
    reset: () => mockReset(),
    setAutomation: (...args: unknown[]) => mockSetAutomation(...args),
  },
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en' }),
}));

vi.mock('@/utilities', () => ({
  showToast: {
    success: (...args: unknown[]) => mockSuccess(...args),
    apiError: (...args: unknown[]) => mockApiError(...args),
  },
}));

function wrapper({ children }: { children: ReactNode }): ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useDeploymentActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTrigger.mockResolvedValue({ dispatched: true });
    mockReset.mockResolvedValue({ reset: true, clearedSha: 'a'.repeat(40) });
    mockSetAutomation.mockResolvedValue({
      manualTriggerEnabled: true,
      automaticDeployEnabled: false,
    });
  });

  it('dispatches the release head with no commit', async () => {
    const { result } = renderHook(() => useDeploymentActions(), { wrapper });

    act(() => result.current.deployLatest());

    await waitFor(() =>
      expect(mockTrigger).toHaveBeenCalledWith({ mode: DeploymentTriggerMode.LATEST }),
    );
    expect(mockSuccess).toHaveBeenCalledWith({
      description: 'adminDeployment.triggerStarted',
    });
  });

  it('dispatches the commit already live', async () => {
    const { result } = renderHook(() => useDeploymentActions(), { wrapper });

    act(() => result.current.redeploy());

    await waitFor(() =>
      expect(mockTrigger).toHaveBeenCalledWith({ mode: DeploymentTriggerMode.REDEPLOY }),
    );
  });

  it('accepts a 40-character commit and clears the field once it lands', async () => {
    const { result } = renderHook(() => useDeploymentActions(), { wrapper });

    act(() => result.current.setTargetSha('b'.repeat(40)));
    await waitFor(() => expect(result.current.isShaValid).toBe(true));
    act(() => result.current.deploySha());

    await waitFor(() =>
      expect(mockTrigger).toHaveBeenCalledWith({
        mode: DeploymentTriggerMode.SHA,
        targetSha: 'b'.repeat(40),
      }),
    );
    await waitFor(() => expect(result.current.targetSha).toBe(''));
  });

  it('never dispatches a commit that is not a full sha', async () => {
    const { result } = renderHook(() => useDeploymentActions(), { wrapper });

    act(() => result.current.setTargetSha('main'));
    await waitFor(() => expect(result.current.isShaValid).toBe(false));
    act(() => result.current.deploySha());

    await waitFor(() => expect(mockTrigger).not.toHaveBeenCalled());
  });

  it('surfaces a dispatch failure as an api error rather than a success', async () => {
    mockTrigger.mockRejectedValue(new Error('A deployment is already running'));
    const { result } = renderHook(() => useDeploymentActions(), { wrapper });

    act(() => result.current.deployLatest());

    await waitFor(() => expect(mockApiError).toHaveBeenCalled());
    expect(mockSuccess).not.toHaveBeenCalled();
  });

  it('reports honestly when a reset found nothing to clear', async () => {
    mockReset.mockResolvedValue({ reset: false, clearedSha: null });
    const { result } = renderHook(() => useDeploymentActions(), { wrapper });

    act(() => result.current.reset());

    await waitFor(() =>
      expect(mockSuccess).toHaveBeenCalledWith({
        description: 'adminDeployment.resetNothingToClear',
      }),
    );
  });

  it('confirms the switch from what the server returned, not from what was asked', async () => {
    const { result } = renderHook(() => useDeploymentActions(), { wrapper });

    act(() => result.current.setAutomaticDeploy(false));

    await waitFor(() => expect(mockSetAutomation).toHaveBeenCalledWith(false));
    expect(mockSuccess).toHaveBeenCalledWith({
      description: 'adminDeployment.automaticPaused',
    });
  });
});
