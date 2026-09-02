import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PlanPriceEditor } from '@/components/admin/plans/plan-price-editor';
import { BillingInterval } from '@/enums/billing.enum';
import type { UseAdminPlanPricesResult } from '@/types/admin-plan-price.types';

function makeController(): UseAdminPlanPricesResult {
  return {
    t: ((key: string) => key) as UseAdminPlanPricesResult['t'],
    locale: 'en-US',
    user: null,
    plan: null,
    prices: [],
    subscriberCounts: new Map(),
    isLoading: false,
    isError: false,
    error: null,
    isSaving: false,
    saveError: null,
    billingInterval: BillingInterval.MONTHLY,
    currency: 'USD',
    amount: '',
    setBillingInterval: vi.fn(),
    setCurrency: vi.fn(),
    setAmount: vi.fn(),
    publish: vi.fn(),
    retry: vi.fn(),
  };
}

describe('PlanPriceEditor', () => {
  it('offers only the supported currencies in a dropdown', () => {
    render(<PlanPriceEditor {...makeController()} />);

    const currency = screen.getByRole('combobox', { name: 'adminPlans.form.currency' });
    fireEvent.click(currency);

    expect(screen.getByRole('option', { name: 'USD' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'EUR' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'EGP' })).toBeInTheDocument();
  });

  it('offers all four billing intervals so an admin can publish QUARTERLY/SEMIANNUAL prices', () => {
    render(<PlanPriceEditor {...makeController()} />);

    const interval = screen.getByRole('combobox', { name: 'billing.interval.toggleLabel' });
    fireEvent.click(interval);

    expect(screen.getByRole('option', { name: 'billing.interval.MONTHLY' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'billing.interval.QUARTERLY' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'billing.interval.SEMIANNUAL' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'billing.interval.YEARLY' })).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(4);
  });
});
