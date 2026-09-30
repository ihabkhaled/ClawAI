import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PlanPriceEditor } from '@/components/admin/plans/plan-price-editor';
import type { UseAdminPlanPricesResult } from '@/types/admin-plan-price.types';

function makeController(): UseAdminPlanPricesResult {
  return {
    t: ((key: string, params?: Record<string, string>) =>
      params === undefined
        ? key
        : `${key}:${JSON.stringify(params)}`) as UseAdminPlanPricesResult['t'],
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
    currency: 'USD',
    amount: '',
    discountInputs: { quarterly: '10', semiannual: '15', yearly: '20' },
    discountsError: null,
    isSavingDiscounts: false,
    setDiscountInput: vi.fn(),
    saveDiscounts: vi.fn(),
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

  it('publishes only the monthly price by hand: there is no interval picker', () => {
    render(<PlanPriceEditor {...makeController()} />);

    expect(
      screen.queryByRole('combobox', { name: 'billing.interval.toggleLabel' }),
    ).not.toBeInTheDocument();
  });

  it('shows one editable discount field per longer term, prefilled from the plan', () => {
    render(<PlanPriceEditor {...makeController()} />);

    expect(screen.getByLabelText(/QUARTERLY/)).toHaveValue(10);
    expect(screen.getByLabelText(/SEMIANNUAL/)).toHaveValue(15);
    expect(screen.getByLabelText(/YEARLY/)).toHaveValue(20);
  });

  it('reports an edit and a save through the controller', () => {
    const controller = makeController();
    render(<PlanPriceEditor {...controller} />);

    fireEvent.change(screen.getByLabelText(/YEARLY/), { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));

    expect(controller.setDiscountInput).toHaveBeenCalledWith('yearly', '25');
    expect(controller.saveDiscounts).toHaveBeenCalledOnce();
  });

  it('shows the validation error in an alert', () => {
    render(
      <PlanPriceEditor
        {...makeController()}
        discountsError="adminPlans.intervalDiscounts.invalid"
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('adminPlans.intervalDiscounts.invalid');
  });
});
