import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PlanForm } from '@/components/admin/plans/plan-form';
import { PLAN_FORM_DEFAULTS } from '@/constants/plan.constants';
import type { PlanFormProps } from '@/types';

function makeProps(overrides: Partial<PlanFormProps> = {}): PlanFormProps {
  return {
    state: { ...PLAN_FORM_DEFAULTS, name: 'Free', slug: 'free' },
    fieldErrors: {},
    paygCreditPreview: null,
    setField: vi.fn(),
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    isSubmitting: false,
    isEdit: true,
    submitErrorMessage: null,
    t: (key: string) => key,
    ...overrides,
  };
}

describe('PlanForm credit-connector free requests field', () => {
  it('renders the value, bounds and helper text', () => {
    render(<PlanForm {...makeProps()} />);
    const input = screen.getByLabelText('adminPlans.form.creditConnectorFreeRequests');
    expect(input).toHaveValue(2);
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '100000');
    expect(screen.getByText('adminPlans.form.creditConnectorFreeRequestsHelp')).toBeInTheDocument();
  });

  it('reports edits through setField', () => {
    const setField = vi.fn();
    render(<PlanForm {...makeProps({ setField })} />);
    fireEvent.change(screen.getByLabelText('adminPlans.form.creditConnectorFreeRequests'), {
      target: { value: '5' },
    });
    expect(setField).toHaveBeenCalledWith('creditConnectorFreeRequestsPerMonth', '5');
  });

  it('renders the error translated, never as the raw key', () => {
    const t = (key: string): string =>
      key === 'adminPlans.form.creditConnectorFreeRequestsInvalid' ? 'Bad number' : key;
    render(
      <PlanForm
        {...makeProps({
          t,
          fieldErrors: {
            creditConnectorFreeRequestsPerMonth:
              'adminPlans.form.creditConnectorFreeRequestsInvalid',
          },
        })}
      />,
    );
    expect(screen.getByText('Bad number')).toBeInTheDocument();
  });
});
