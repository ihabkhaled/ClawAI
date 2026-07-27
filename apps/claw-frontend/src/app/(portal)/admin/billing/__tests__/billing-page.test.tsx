import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminBillingPage from '@/app/(portal)/admin/billing/page';
import { UserRole } from '@/enums/user-role.enum';

const mockHook = vi.fn();
const retry = vi.fn();

vi.mock('@/hooks/admin/use-admin-billing-dashboard', () => ({
  useAdminBillingDashboard: () => mockHook(),
}));

vi.mock('@/components/admin/billing/billing-dashboard-content', () => ({
  BillingDashboardContent: ({ dashboard }: { dashboard: unknown }) => (
    <div data-testid="dashboard">{dashboard === null ? 'empty' : 'success'}</div>
  ),
}));

function controller(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    t: (key: string) => key,
    locale: 'en',
    user: { id: 'admin-1', role: UserRole.ADMIN },
    dashboard: null,
    isLoading: false,
    isError: false,
    error: null,
    retry,
    ...overrides,
  };
}

describe('AdminBillingPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders loading', () => {
    mockHook.mockReturnValue(controller({ isLoading: true }));
    render(<AdminBillingPage />);
    expect(screen.getByText('adminBilling.loading')).toBeInTheDocument();
  });

  it('renders an actionable error', () => {
    mockHook.mockReturnValue(controller({ isError: true }));
    render(<AdminBillingPage />);
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(screen.getByRole('alert')).toHaveTextContent('adminBilling.error');
    expect(retry).toHaveBeenCalledOnce();
  });

  it('renders the empty state through the dashboard content', () => {
    mockHook.mockReturnValue(controller());
    render(<AdminBillingPage />);
    expect(screen.getByTestId('dashboard')).toHaveTextContent('empty');
  });

  it('renders successful metrics', () => {
    mockHook.mockReturnValue(controller({ dashboard: { failedPayments: 2 } }));
    render(<AdminBillingPage />);
    expect(screen.getByTestId('dashboard')).toHaveTextContent('success');
  });
});
