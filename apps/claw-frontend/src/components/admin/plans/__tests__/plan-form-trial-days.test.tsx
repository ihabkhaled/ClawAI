import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PlanForm } from '@/components/admin/plans/plan-form';
import { PLAN_FORM_DEFAULTS } from '@/constants/plan.constants';
import type { PlanFormProps } from '@/types';

function makeProps(overrides: Partial<PlanFormProps> = {}): PlanFormProps {
  return {
    state: { ...PLAN_FORM_DEFAULTS, name: 'Free', slug: 'free', isTrial: true },
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

describe('PlanForm trial length field', () => {
  it('is shown only for a trial plan', () => {
    const { rerender } = render(<PlanForm {...makeProps()} />);
    expect(screen.getByLabelText('adminPlans.form.trialDays')).toHaveValue(30);

    rerender(
      <PlanForm {...makeProps({ state: { ...PLAN_FORM_DEFAULTS, name: 'Pro', slug: 'pro' } })} />,
    );
    expect(screen.queryByLabelText('adminPlans.form.trialDays')).not.toBeInTheDocument();
  });

  it('accepts any length, not just 30', () => {
    const setField = vi.fn();
    render(<PlanForm {...makeProps({ setField })} />);
    fireEvent.change(screen.getByLabelText('adminPlans.form.trialDays'), {
      target: { value: '365' },
    });
    expect(setField).toHaveBeenCalledWith('trialDurationDays', '365');
  });

  it('renders the error as translated text, never the raw key', () => {
    const t = (key: string): string =>
      key === 'adminPlans.form.trialDaysInvalid' ? 'Bad days' : key;
    render(
      <PlanForm
        {...makeProps({
          t,
          fieldErrors: { trialDurationDays: 'adminPlans.form.trialDaysInvalid' },
        })}
      />,
    );
    expect(screen.getByText('Bad days')).toBeInTheDocument();
  });
});
