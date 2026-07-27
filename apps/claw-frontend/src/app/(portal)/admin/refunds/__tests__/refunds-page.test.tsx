import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminRefundsPage from '@/app/(portal)/admin/refunds/page';

const mockHook = vi.fn();

vi.mock('@/hooks/admin/use-admin-refunds', () => ({
  useAdminRefunds: () => mockHook(),
}));

function hook(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    transactions: [],
    isLoading: false,
    isError: false,
    error: null,
    pendingId: null,
    mutationError: null,
    requestRefund: vi.fn(),
    clearMutationError: vi.fn(),
    retry: vi.fn(),
    t: (key: string) => key,
    ...overrides,
  };
}

describe('AdminRefundsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a directed empty state', () => {
    mockHook.mockReturnValue(hook());
    render(<AdminRefundsPage />);
    expect(screen.getByText('adminRefunds.empty')).toBeInTheDocument();
  });

  it('renders refundable captures from the ledger', () => {
    mockHook.mockReturnValue(
      hook({
        transactions: [
          {
            id: 'charge-1',
            userId: 'user-1',
            subscriptionId: 'subscription-1',
            gateway: 'PAYPAL',
            capturedAmountMinor: 10_000,
            remainingAmountMinor: 7_500,
            currency: 'USD',
            capturedAt: '2026-07-27T10:00:00.000Z',
          },
        ],
      }),
    );
    render(<AdminRefundsPage />);
    expect(screen.getByText('charge-1')).toBeInTheDocument();
    expect(screen.queryByText('adminRefunds.empty')).not.toBeInTheDocument();
  });
});
