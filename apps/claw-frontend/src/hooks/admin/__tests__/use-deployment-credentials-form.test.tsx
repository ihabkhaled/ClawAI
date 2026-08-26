import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDeploymentCredentialsForm } from '@/hooks/admin/use-deployment-credentials-form';

const mockSave = vi.fn();
const mockClear = vi.fn();
const mockSuccess = vi.fn();
const mockApiError = vi.fn();

vi.mock('@/repositories/admin/deployment.repository', () => ({
  deploymentRepository: {
    saveCredentials: (...args: unknown[]) => mockSave(...args),
    clearCredentials: () => mockClear(),
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

const TOKEN = 'github_pat_11ABCDEFG0123456789';

describe('useDeploymentCredentialsForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSave.mockResolvedValue({ source: 'database' });
    mockClear.mockResolvedValue({ cleared: true, source: 'none' });
  });

  it('requires a token when nothing is stored yet', async () => {
    const { result } = renderHook(() => useDeploymentCredentialsForm(false), { wrapper });

    act(() => {
      result.current.setRepository('ihabkhaled/ClawAI');
      result.current.setRef('main');
    });

    await waitFor(() => expect(result.current.canSave).toBe(false));
  });

  it('allows a blank token once credentials are stored, meaning keep it', async () => {
    const { result } = renderHook(() => useDeploymentCredentialsForm(true), { wrapper });

    act(() => {
      result.current.setRepository('ihabkhaled/ClawAI');
      result.current.setRef('main');
    });

    await waitFor(() => expect(result.current.canSave).toBe(true));
    act(() => result.current.save());
    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith({ repository: 'ihabkhaled/ClawAI', ref: 'main' }),
    );
  });

  it('rejects a repository that is not owner/repo', async () => {
    const { result } = renderHook(() => useDeploymentCredentialsForm(true), { wrapper });

    act(() => {
      result.current.setRepository('ClawAI');
      result.current.setRef('main');
    });

    await waitFor(() => expect(result.current.canSave).toBe(false));
  });

  it('rejects a token too short to be real', async () => {
    const { result } = renderHook(() => useDeploymentCredentialsForm(false), { wrapper });

    act(() => {
      result.current.setRepository('ihabkhaled/ClawAI');
      result.current.setRef('main');
      result.current.setToken('short');
    });

    await waitFor(() => expect(result.current.canSave).toBe(false));
  });

  it('sends a typed token and clears the field once it lands', async () => {
    const { result } = renderHook(() => useDeploymentCredentialsForm(false), { wrapper });

    act(() => {
      result.current.setRepository('ihabkhaled/ClawAI');
      result.current.setRef('main');
      result.current.setToken(TOKEN);
    });
    await waitFor(() => expect(result.current.canSave).toBe(true));
    act(() => result.current.save());

    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith({
        repository: 'ihabkhaled/ClawAI',
        ref: 'main',
        token: TOKEN,
      }),
    );
    await waitFor(() => expect(result.current.token).toBe(''));
  });

  it('never submits while the form is invalid', async () => {
    const { result } = renderHook(() => useDeploymentCredentialsForm(false), { wrapper });

    act(() => result.current.save());

    await waitFor(() => expect(mockSave).not.toHaveBeenCalled());
  });

  it('surfaces a save failure as an api error', async () => {
    mockSave.mockRejectedValue(new Error('nope'));
    const { result } = renderHook(() => useDeploymentCredentialsForm(true), { wrapper });

    act(() => {
      result.current.setRepository('ihabkhaled/ClawAI');
      result.current.setRef('main');
    });
    await waitFor(() => expect(result.current.canSave).toBe(true));
    act(() => result.current.save());

    await waitFor(() => expect(mockApiError).toHaveBeenCalled());
    expect(mockSuccess).not.toHaveBeenCalled();
  });

  it('drops the typed token when editing is cancelled', async () => {
    const { result } = renderHook(() => useDeploymentCredentialsForm(true), { wrapper });

    act(() => {
      result.current.startEditing();
      result.current.setToken(TOKEN);
    });
    await waitFor(() => expect(result.current.isEditing).toBe(true));
    act(() => result.current.cancelEditing());

    await waitFor(() => expect(result.current.token).toBe(''));
    expect(result.current.isEditing).toBe(false);
  });

  it('clears the stored credentials', async () => {
    const { result } = renderHook(() => useDeploymentCredentialsForm(true), { wrapper });

    act(() => result.current.clear());

    await waitFor(() => expect(mockClear).toHaveBeenCalledOnce());
    expect(mockSuccess).toHaveBeenCalledWith({
      description: 'adminDeployment.credentialsCleared',
    });
  });
});
