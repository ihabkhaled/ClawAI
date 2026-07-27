import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminPlanPricesPage from '@/app/(portal)/admin/plans/[id]/prices/page';
import { UserRole } from '@/enums/user-role.enum';

const mockHook = vi.fn();
const retry = vi.fn();

vi.mock('@/hooks/plans/use-admin-plan-prices', () => ({
  useAdminPlanPrices: () => mockHook(),
}));

vi.mock('@/components/admin/plans/plan-price-editor', () => ({
  PlanPriceEditor: ({ prices }: { prices: unknown[] }) => (
    <div data-testid="editor">{prices.length === 0 ? 'empty' : 'success'}</div>
  ),
}));

function controller(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    t: (key: string) => key,
    locale: 'en',
    user: { id: 'admin-1', role: UserRole.ADMIN },
    plan: null,
    prices: [],
    subscriberCounts: new Map(),
    isLoading: false,
    isError: false,
    error: null,
    isSaving: false,
    saveError: null,
    billingInterval: 'MONTHLY',
    currency: 'USD',
    amount: '',
    setBillingInterval: vi.fn(),
    setCurrency: vi.fn(),
    setAmount: vi.fn(),
    publish: vi.fn(),
    retry,
    ...overrides,
  };
}

describe('AdminPlanPricesPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders loading', () => {
    mockHook.mockReturnValue(controller({ isLoading: true }));
    render(<AdminPlanPricesPage />);
    expect(screen.getByText('common.loading')).toBeInTheDocument();
  });

  it('renders an actionable error', () => {
    mockHook.mockReturnValue(controller({ isError: true }));
    render(<AdminPlanPricesPage />);
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(screen.getByRole('alert')).toHaveTextContent('adminPlans.error');
    expect(retry).toHaveBeenCalledOnce();
  });

  it('renders the empty price history', () => {
    mockHook.mockReturnValue(controller());
    render(<AdminPlanPricesPage />);
    expect(screen.getByTestId('editor')).toHaveTextContent('empty');
  });

  it('renders immutable price versions', () => {
    mockHook.mockReturnValue(controller({ prices: [{ id: 'price-v2' }] }));
    render(<AdminPlanPricesPage />);
    expect(screen.getByTestId('editor')).toHaveTextContent('success');
  });
});
