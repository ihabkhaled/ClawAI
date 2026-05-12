import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PolicyFormDialog } from '@/components/admin/policy-form-dialog';
import { AdminFormMode } from '@/enums/admin-form-mode.enum';
import { AiActionPolicyKind } from '@/enums/ai-action-policy-kind.enum';
import { RiskLabel } from '@/enums/risk-label.enum';
import type { AiActionPolicy } from '@/types/ai-action-policy.types';

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  onSubmitCreate: vi.fn(),
  onSubmitUpdate: vi.fn(),
  isSubmitting: false,
  submitErrorMessage: null,
  t: (key: string) => key,
};

const existing: AiActionPolicy = {
  id: 'p1',
  name: 'deny-pii',
  kind: AiActionPolicyKind.DENY,
  description: 'Blocks PII',
  providerRegex: '.*',
  actionKindRegex: '.*',
  riskMaxLabel: RiskLabel.CRITICAL,
  riskMaxScore: 100,
  priority: 1000,
  requireReason: true,
  isActive: true,
  isSystemDefault: false,
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
};

describe('PolicyFormDialog', () => {
  it('renders create title and an enabled name field when in create mode', () => {
    render(
      <PolicyFormDialog {...baseProps} mode={AdminFormMode.CREATE} initial={null} />,
    );
    expect(screen.getByText('adminAutomation.policies.createTitle')).toBeInTheDocument();
    const nameField = screen.getByLabelText('adminAutomation.policies.nameLabel');
    expect(nameField).not.toBeDisabled();
  });

  it('renders edit title and a disabled name field when in edit mode', () => {
    render(
      <PolicyFormDialog {...baseProps} mode={AdminFormMode.EDIT} initial={existing} />,
    );
    expect(screen.getByText('adminAutomation.policies.editTitle')).toBeInTheDocument();
    const nameField = screen.getByLabelText('adminAutomation.policies.nameLabel');
    expect(nameField).toBeDisabled();
    expect((nameField as HTMLInputElement).value).toBe('deny-pii');
  });

  it('does not call onSubmitCreate when validation fails', async () => {
    const onSubmitCreate = vi.fn();
    const user = userEvent.setup();
    render(
      <PolicyFormDialog
        {...baseProps}
        mode={AdminFormMode.CREATE}
        initial={null}
        onSubmitCreate={onSubmitCreate}
      />,
    );
    const saveBtn = screen.getByRole('button', { name: 'adminAutomation.policies.submit' });
    await user.click(saveBtn);
    expect(onSubmitCreate).not.toHaveBeenCalled();
  });

  it('calls onSubmitCreate with valid payload', async () => {
    const onSubmitCreate = vi.fn();
    const user = userEvent.setup();
    render(
      <PolicyFormDialog
        {...baseProps}
        mode={AdminFormMode.CREATE}
        initial={null}
        onSubmitCreate={onSubmitCreate}
      />,
    );
    const nameField = screen.getByLabelText('adminAutomation.policies.nameLabel');
    await user.type(nameField, 'my-policy');
    const saveBtn = screen.getByRole('button', { name: 'adminAutomation.policies.submit' });
    await user.click(saveBtn);
    expect(onSubmitCreate).toHaveBeenCalledTimes(1);
    expect(onSubmitCreate.mock.calls[0]?.[0]).toMatchObject({ name: 'my-policy' });
  });

  it('shows submitting label when isSubmitting', () => {
    render(
      <PolicyFormDialog
        {...baseProps}
        mode={AdminFormMode.CREATE}
        initial={null}
        isSubmitting
      />,
    );
    expect(screen.getByText('adminAutomation.policies.submitting')).toBeInTheDocument();
  });

  it('shows submit error message when provided', () => {
    render(
      <PolicyFormDialog
        {...baseProps}
        mode={AdminFormMode.CREATE}
        initial={null}
        submitErrorMessage="something blew up"
      />,
    );
    expect(screen.getByText('something blew up')).toBeInTheDocument();
  });
});
