import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LiveCreditsPanel } from '@/components/live/live-credits-panel';
import { LiveSessionState } from '@/enums/live.enum';
import type { LiveUsage } from '@/types/live.types';

const mockApprove = vi.fn();
const mockSuccess = vi.fn();
const mockApiError = vi.fn();

vi.mock('@/repositories/live/live.repository', () => ({
  liveRepository: { approveCredits: (...args: unknown[]) => mockApprove(...args) },
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en' }),
}));

vi.mock('@/utilities', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    showToast: {
      success: (...args: unknown[]) => mockSuccess(...args),
      apiError: (...args: unknown[]) => mockApiError(...args),
    },
  };
});

const USAGE: LiveUsage = {
  month: '2026-11',
  freeSecondsTotal: 1800,
  freeSecondsUsed: 1800,
  paidMicroUsdPerMinute: 20_000,
  graceSeconds: 60,
  policyVersion: 1,
};

function renderPanel(): void {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const t = (key: string, params?: Record<string, string | number>): string =>
    params === undefined ? key : `${key} ${JSON.stringify(params)}`;
  const tree: ReactElement = (
    <QueryClientProvider client={client}>
      <LiveCreditsPanel sessionId="s1" usage={USAGE} t={t} locale="en" />
    </QueryClientProvider>
  );
  render(tree);
}

describe('LiveCreditsPanel', () => {
  beforeEach(() => {
    mockApprove.mockReset();
    mockSuccess.mockReset();
    mockApiError.mockReset();
    // The real answer: LiveSessionStateView, not usage.
    mockApprove.mockResolvedValue({
      sessionId: 's1',
      state: LiveSessionState.ACTIVE,
      language: 'en',
      runId: 'r1',
    });
  });

  it('shows the price per minute before anything is charged', () => {
    renderPanel();
    expect(screen.getByTestId('live-credits-panel')).toHaveTextContent('$0.02');
  });

  it('approves without a cap when the cap is blank', async () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'live.credits.approve' }));
    await waitFor(() => expect(mockApprove).toHaveBeenCalledWith('s1', {}));
    await waitFor(() => expect(mockSuccess).toHaveBeenCalled());
  });

  it('sends the cap as integer micro-USD', async () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText('live.credits.capLabel'), { target: { value: '2.50' } });
    fireEvent.click(screen.getByRole('button', { name: 'live.credits.approve' }));
    await waitFor(() =>
      expect(mockApprove).toHaveBeenCalledWith('s1', { spendingCapMicroUsd: 2_500_000 }),
    );
  });

  it('blocks an invalid cap and never calls the server', () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText('live.credits.capLabel'), { target: { value: 'abc' } });
    expect(screen.getByText('live.credits.capInvalid')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'live.credits.approve' })).toBeDisabled();
    expect(mockApprove).not.toHaveBeenCalled();
  });

  it('surfaces a refused approval', async () => {
    mockApprove.mockRejectedValueOnce(new Error('402'));
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'live.credits.approve' }));
    await waitFor(() => expect(mockApiError).toHaveBeenCalled());
  });
});
