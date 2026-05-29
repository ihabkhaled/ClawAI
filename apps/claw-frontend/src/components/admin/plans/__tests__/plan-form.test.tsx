import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PlanForm } from '@/components/admin/plans/plan-form';
import { PLAN_FORM_DEFAULTS } from '@/constants/plan.constants';
import type { PlanFormFieldErrors, PlanFormProps } from '@/types';

function makeProps(overrides: Partial<PlanFormProps> = {}): PlanFormProps {
  return {
    state: { ...PLAN_FORM_DEFAULTS, name: 'Pro', slug: 'pro' },
    fieldErrors: {},
    setField: vi.fn(),
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    isSubmitting: false,
    isEdit: false,
    submitErrorMessage: null,
    t: (key: string) => key,
    ...overrides,
  };
}

describe('PlanForm', () => {
  it('renders the create submit label and enables the submit button', () => {
    render(<PlanForm {...makeProps()} />);
    expect(screen.getByRole('button', { name: 'adminPlans.form.submitCreate' })).toBeEnabled();
  });

  it('renders the update label and disables the slug field in edit mode', () => {
    render(<PlanForm {...makeProps({ isEdit: true })} />);
    expect(
      screen.getByRole('button', { name: 'adminPlans.form.submitUpdate' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('adminPlans.form.slug')).toBeDisabled();
  });

  it('shows the submitting label and disables submit while submitting', () => {
    render(<PlanForm {...makeProps({ isSubmitting: true })} />);
    expect(screen.getByRole('button', { name: 'adminPlans.form.submitting' })).toBeDisabled();
  });

  it('renders field error messages when present', () => {
    const fieldErrors: PlanFormFieldErrors = { name: 'name required', slug: 'slug required' };
    render(<PlanForm {...makeProps({ fieldErrors })} />);
    expect(screen.getByText('name required')).toBeInTheDocument();
    expect(screen.getByText('slug required')).toBeInTheDocument();
  });

  it('renders the submit error alert when provided', () => {
    render(<PlanForm {...makeProps({ submitErrorMessage: 'server boom' })} />);
    expect(screen.getByRole('alert')).toHaveTextContent('server boom');
  });

  it('invokes onSubmit on form submission and onCancel on cancel', async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<PlanForm {...makeProps({ onSubmit, onCancel })} />);
    await user.click(screen.getByRole('button', { name: 'adminPlans.form.submitCreate' }));
    expect(onSubmit).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'common.cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('forwards text edits through setField', async () => {
    const setField = vi.fn();
    const user = userEvent.setup();
    render(<PlanForm {...makeProps({ state: { ...PLAN_FORM_DEFAULTS }, setField })} />);
    await user.type(screen.getByLabelText('adminPlans.form.name'), 'X');
    expect(setField).toHaveBeenCalledWith('name', 'X');
  });
});
