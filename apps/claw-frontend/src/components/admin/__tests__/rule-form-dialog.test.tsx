import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RuleFormDialog } from '@/components/admin/rule-form-dialog';
import { AdminFormMode } from '@/enums/admin-form-mode.enum';
import type { SuggestionTriggerRule } from '@/types/ai-action-policy.types';

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  onSubmitCreate: vi.fn(),
  onSubmitUpdate: vi.fn(),
  isSubmitting: false,
  submitErrorMessage: null,
  t: (key: string) => key,
};

const existing: SuggestionTriggerRule = {
  id: 'r1',
  name: 'github-pr-opened',
  description: 'When a PR opens',
  eventType: 'workspace.webhook.received',
  providerRegex: '^GITHUB$',
  contentRegex: '"action"\\s*:\\s*"opened"',
  actionKindToSuggest: 'SUMMARIZE',
  isActive: true,
  isSystemDefault: false,
  priority: 500,
  perRuleBudgetPerHour: null,
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
};

describe('RuleFormDialog', () => {
  it('renders create title in create mode', () => {
    render(<RuleFormDialog {...baseProps} mode={AdminFormMode.CREATE} initial={null} />);
    expect(screen.getByText('adminAutomation.rules.createTitle')).toBeInTheDocument();
  });

  it('disables name field in edit mode and pre-fills', () => {
    render(<RuleFormDialog {...baseProps} mode={AdminFormMode.EDIT} initial={existing} />);
    const nameField = screen.getByLabelText('adminAutomation.rules.nameLabel');
    expect(nameField).toBeDisabled();
    expect((nameField as HTMLInputElement).value).toBe('github-pr-opened');
  });

  it('skips onSubmitCreate when validation fails', async () => {
    const onSubmitCreate = vi.fn();
    const user = userEvent.setup();
    render(
      <RuleFormDialog
        {...baseProps}
        mode={AdminFormMode.CREATE}
        initial={null}
        onSubmitCreate={onSubmitCreate}
      />,
    );
    const saveBtn = screen.getByRole('button', { name: 'adminAutomation.rules.submit' });
    await user.click(saveBtn);
    expect(onSubmitCreate).not.toHaveBeenCalled();
  });

  it('submits with valid payload', async () => {
    const onSubmitCreate = vi.fn();
    const user = userEvent.setup();
    render(
      <RuleFormDialog
        {...baseProps}
        mode={AdminFormMode.CREATE}
        initial={null}
        onSubmitCreate={onSubmitCreate}
      />,
    );
    const nameField = screen.getByLabelText('adminAutomation.rules.nameLabel');
    await user.type(nameField, 'custom-rule');
    const saveBtn = screen.getByRole('button', { name: 'adminAutomation.rules.submit' });
    await user.click(saveBtn);
    expect(onSubmitCreate).toHaveBeenCalledTimes(1);
    expect(onSubmitCreate.mock.calls[0]?.[0]).toMatchObject({ name: 'custom-rule' });
  });

  it('shows submitting label when isSubmitting', () => {
    render(
      <RuleFormDialog
        {...baseProps}
        mode={AdminFormMode.CREATE}
        initial={null}
        isSubmitting
      />,
    );
    expect(screen.getByText('adminAutomation.rules.submitting')).toBeInTheDocument();
  });
});
