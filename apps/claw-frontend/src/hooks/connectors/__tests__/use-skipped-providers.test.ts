import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConnectorProvider, ConnectorStatus } from '@/enums';
import { ProviderBreakerReason } from '@/enums/provider-breaker-reason.enum';
import { ProviderBreakerSource } from '@/enums/provider-breaker-source.enum';
import { providerBreakerRepository } from '@/repositories/admin/provider-breaker.repository';
import type { Connector } from '@/types/connector.types';
import { showToast } from '@/utilities';

import { useSkippedProviders } from '../use-skipped-providers';

let mockUser: { role: string } | null = { role: 'ADMIN' };
const translate = (key: string): string => key;

vi.mock('@/hooks/auth/use-current-user', () => ({
  useCurrentUser: () => ({ user: mockUser, isLoading: false, isError: false, error: null }),
}));
vi.mock('@/repositories/admin/provider-breaker.repository');
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: translate, locale: 'en', dir: 'ltr' }),
}));
vi.mock('@/utilities', () => ({
  showToast: { success: vi.fn(), error: vi.fn(), apiError: vi.fn() },
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

function makeWrapper(): (props: { children: ReactNode }) => ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const connector = (name: string, provider: ConnectorProvider): Connector => ({
  id: `c-${name}`,
  name,
  provider,
  status: ConnectorStatus.HEALTHY,
  authType: 'API_KEY',
  isEnabled: true,
  defaultModelId: null,
  baseUrl: null,
  region: null,
  workspaceId: null,
  maskedApiKey: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
});

const CONNECTORS = [
  connector('OpenAI prod', ConnectorProvider.OPENAI),
  connector('OpenAI backup', ConnectorProvider.OPENAI),
  connector('Gemini', ConnectorProvider.GEMINI),
];

describe('useSkippedProviders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { role: 'ADMIN' };
    vi.mocked(providerBreakerRepository.list).mockResolvedValue({
      source: ProviderBreakerSource.REDIS,
      providers: [
        {
          provider: 'OPENAI',
          reason: ProviderBreakerReason.ACCOUNT_CREDIT_EXHAUSTED,
          skippedUntil: '2026-09-25T10:10:00.000Z',
          trippedAt: '2026-09-25T10:00:00.000Z',
          probing: true,
        },
        {
          provider: 'ANTHROPIC',
          reason: ProviderBreakerReason.ACCOUNT_CREDIT_EXHAUSTED,
          skippedUntil: '2026-09-25T10:12:00.000Z',
          trippedAt: '2026-09-25T10:02:00.000Z',
          probing: false,
        },
      ],
    });
  });

  it('ADMIN: joins each skipped provider to the connectors that use it', async () => {
    const { result } = renderHook(() => useSkippedProviders(CONNECTORS), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.rows).toHaveLength(2));
    expect(result.current.isVisible).toBe(true);
    expect(result.current.rows[0]).toMatchObject({
      provider: 'OPENAI',
      connectorLabel: 'OpenAI prod, OpenAI backup',
      reasonLabel: 'skippedProviders.reasons.accountCreditExhausted',
      probing: true,
    });
    expect(result.current.rows[1]?.connectorLabel).toBe('skippedProviders.noConnector');
    expect(result.current.isPartial).toBe(false);
  });

  it.each(['OPERATOR', 'VIEWER'])('%s: not visible and never fetches', async (role) => {
    mockUser = { role };
    const { result } = renderHook(() => useSkippedProviders(CONNECTORS), {
      wrapper: makeWrapper(),
    });
    expect(result.current.isVisible).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(providerBreakerRepository.list).not.toHaveBeenCalled();
  });

  it('flags a MEMORY listing as partial', async () => {
    vi.mocked(providerBreakerRepository.list).mockResolvedValue({
      source: ProviderBreakerSource.MEMORY,
      providers: [],
    });
    const { result } = renderHook(() => useSkippedProviders(CONNECTORS), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isPartial).toBe(true));
  });

  it('clear calls the endpoint, toasts, and refetches the list', async () => {
    vi.mocked(providerBreakerRepository.clear).mockResolvedValue({
      provider: 'OPENAI',
      cleared: true,
    });
    const { result } = renderHook(() => useSkippedProviders(CONNECTORS), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.rows).toHaveLength(2));
    act(() => {
      result.current.clear('OPENAI');
    });
    await waitFor(() =>
      expect(showToast.success).toHaveBeenCalledWith({ title: 'skippedProviders.cleared' }),
    );
    expect(vi.mocked(providerBreakerRepository.clear).mock.calls[0]?.[0]).toBe('OPENAI');
    await waitFor(() => expect(providerBreakerRepository.list).toHaveBeenCalledTimes(2));
  });

  it('a failed clear shows the translated error', async () => {
    vi.mocked(providerBreakerRepository.clear).mockRejectedValue(new Error('403'));
    const { result } = renderHook(() => useSkippedProviders(CONNECTORS), {
      wrapper: makeWrapper(),
    });
    act(() => {
      result.current.clear('OPENAI');
    });
    await waitFor(() =>
      expect(showToast.apiError).toHaveBeenCalledWith(
        expect.any(Error),
        'skippedProviders.clearFailed',
      ),
    );
  });
});
